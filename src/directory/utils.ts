import { MAX_DIRECTORY_NAME_LENGTH } from './handler'
import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types'
import { assertString, isNumber, isString } from '../utils/type'
import { replaceAll } from '../utils/string'
import * as fs from 'fs'
import * as nodePath from 'path'
import { isNode } from '../shim/utils'
import { getBaseName } from '../file/utils'

/**
 * Type of file system: Node.js or browser
 */
export enum FileSystemType {
  node,
  browser,
}

/**
 * Information about a file
 */
export interface FileInfo {
  // type of file system
  fileSystemType: FileSystemType
  // full path of the file. Empty for browser file
  fullPath: string
  // relative path of a file without base path. e.g `file.txt`
  relativePath: string
  // relative path of a file with base path. e.g `/all-files/file.txt`
  relativePathWithBase: string
  // original browser file
  browserFile?: File
}

/**
 * Split path
 */
export function splitPath(path: string): string[] {
  return path.split('/')
}

/**
 * Combine passed parts of path to full path
 *
 * @param parts path parts to combine
 */
export function combine(...parts: string[]): string {
  // remove empty items
  parts = parts.filter(item => item !== '')
  // remove slashes if element contains not only slash
  parts = parts.map(part => (part.length > 1 ? replaceAll(part, '/', '') : part))

  // add slash to the start of parts if it is not the first element
  if (parts[0] !== '/') {
    parts.unshift('/')
  }

  return getPathFromParts(parts)
}

/**
 * Splits path to parts
 *
 * @param path absolute path
 */
export function getPathParts(path: string): string[] {
  if (path.length === 0) {
    throw new Error('Path is empty')
  }

  if (!path.startsWith('/')) {
    throw new Error('Incorrect path')
  }

  if (path === '/') {
    return ['/']
  }

  return ['/', ...path.split('/').slice(1)]
}

/**
 * Join parts to path with removing a certain number of parts from the end
 *
 * @param parts parts of path
 * @param minusParts hom many parts should be removed
 */
export function getPathFromParts(parts: string[], minusParts = 0): string {
  if (parts.length === 0) {
    throw new Error('Parts list is empty')
  }

  if (parts[0] !== '/') {
    throw new Error('Path parts must start with "/"')
  }

  if (parts.length <= minusParts) {
    throw new Error('Incorrect parts count')
  }

  return '/' + parts.slice(1, parts.length - minusParts).join('/')
}

/**
 * Asserts that parts length is correct
 */
export function assertPartsLength(value: unknown): asserts value is string[] {
  const parts = value as string[]

  if (parts.length < 2) {
    throw new Error('Can not create directory for root')
  }
}

/**
 * Asserts that directory name is correct
 */
export function assertDirectoryName(value: unknown): asserts value is string {
  assertString(value)

  if (value.length === 0) {
    throw new Error('Name is empty')
  }

  if (value.includes('/')) {
    throw new Error('Name contains "/" symbol')
  }

  if (value.length > MAX_DIRECTORY_NAME_LENGTH) {
    throw new Error('Directory name is too long')
  }
}

/**
 * Asserts that raw directory metadata is correct
 */
export function assertRawDirectoryMetadata(value: unknown): asserts value is RawDirectoryMetadata {
  if (!isRawDirectoryMetadata(value)) {
    throw new Error('Invalid raw directory metadata')
  }
}

/**
 * Asserts that raw file metadata is correct
 */
export function assertRawFileMetadata(value: unknown): asserts value is RawFileMetadata {
  if (!isRawFileMetadata(value)) {
    throw new Error('Invalid raw file metadata')
  }
}

/**
 * Raw directory metadata guard
 */
export function isRawDirectoryMetadata(value: unknown): value is RawDirectoryMetadata {
  const data = value as RawDirectoryMetadata

  return (
    typeof data.meta === 'object' &&
    isString(data.meta.name) &&
    isString(data.meta.path) &&
    isNumber(data.meta.accessTime) &&
    isNumber(data.meta.modificationTime) &&
    isNumber(data.meta.creationTime) &&
    isNumber(data.meta.version) &&
    (data.fileOrDirNames === null || Array.isArray(data.fileOrDirNames))
  )
}

/**
 * Raw file metadata guard
 */
export function isRawFileMetadata(value: unknown): value is RawFileMetadata {
  const {
    version,
    filePath,
    fileName,
    fileSize,
    blockSize,
    contentType,
    compression,
    creationTime,
    accessTime,
    modificationTime,
    fileInodeReference,
  } = value as RawFileMetadata

  return (
    isNumber(version) &&
    isString(filePath) &&
    isString(fileName) &&
    isNumber(fileSize) &&
    isNumber(blockSize) &&
    isString(contentType) &&
    isString(compression) &&
    isNumber(creationTime) &&
    isNumber(accessTime) &&
    isNumber(modificationTime) &&
    isString(fileInodeReference)
  )
}

/**
 * Gets a list of paths by a path
 */
export async function getNodePaths(path: string, recursive = false): Promise<string[]> {
  if (!fs.existsSync(path)) {
    throw new Error(`Directory does not exist: "${path}"`)
  }

  const filePaths: string[] = []
  const entries = await fs.promises.readdir(path, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = nodePath.join(path, entry.name)

    if (entry.isDirectory() && recursive) {
      filePaths.push(...(await getNodePaths(entryPath, true)))
    } else if (entry.isFile()) {
      filePaths.push(entryPath)
    }
  }

  return filePaths
}

/**
 * Gets a list of directories that should be created before files uploading
 */
export function getDirectoriesToCreate(paths: string[]): string[] {
  const directories = new Set()
  directories.entries()

  paths.forEach(path => {
    const pathDirectories = path.split('/').slice(0, -1)
    let currentDirectory = ''
    pathDirectories.forEach(directory => {
      currentDirectory += '/' + directory
      directories.add(currentDirectory)
    })
  })

  return [...directories] as string[]
}

/**
 * Converts browser's `FileList` to `InfoList`
 */
export function browserFilesToFileInfoList(files: FileList): FileInfo[] {
  if (files.length === 0) {
    return []
  }

  const testFilePath = files[0]?.webkitRelativePath
  assertString(testFilePath, '"webkitRelativePath" property should be a string')
  const parts = testFilePath.split('/')

  // `webkitRelativePath` always contains base file path
  if (parts.length < 2) {
    throw new Error(`"webkitRelativePath" does not contain base path part: "${testFilePath}"`)
  }

  return Array.from(files).map(file => {
    const relativePath = file.webkitRelativePath.substring(parts[0].length + 1)

    return {
      fileSystemType: FileSystemType.browser,
      fullPath: '',
      relativePath,
      relativePathWithBase: file.webkitRelativePath,
      browserFile: file,
    }
  })
}

/**
 * Gets files list with base path like in a browser's `File` object
 */
export async function getNodeFileInfoList(path: string, recursive: boolean): Promise<FileInfo[]> {
  const paths = await getNodePaths(path, recursive)
  const pathLength = path.length + 1
  const basePath = nodePath.basename(path)

  return paths.map(fullPath => {
    const relativePath = fullPath.substring(pathLength)
    const relativePathWithBase = nodePath.join(basePath, relativePath)

    return {
      fileSystemType: FileSystemType.node,
      fullPath,
      relativePath,
      relativePathWithBase,
    }
  })
}

/**
 * Assert that `File` instance from browser contains `webkitRelativePath`
 */
export function assertBrowserFilesWithPath(value: unknown): asserts value is FileList {
  if (isNode()) {
    throw new Error('File info asserting is available only in browser')
  }

  if (!(value instanceof FileList)) {
    throw new Error('Browser files is not `FileList`')
  }

  const data = Array.from(value)
  for (const item of data) {
    if (!(item instanceof File)) {
      throw new Error(`Item of browser files is not a File instance`)
    }

    if (!('webkitRelativePath' in item)) {
      throw new Error(`${item.name} does not contain "webkitRelativePath"`)
    }
  }
}

/**
 * Filters FileInfo items where filename starts with dot
 */
export function filterDotFiles(files: FileInfo[]): FileInfo[] {
  return files.filter(item => {
    const basename = getBaseName(item.relativePath)

    return !basename || !basename.startsWith('.')
  })
}

/**
 * Filters extra files found recursively which browser adds by default
 */
export function filterBrowserRecursiveFiles(files: FileInfo[]): FileInfo[] {
  return files.filter(item => !item.relativePath.includes('/'))
}

/**
 * Gets files content in Node.js environment
 */
export function getNodeFileContent(fullPath: string): Uint8Array {
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: "${fullPath}"`)
  }

  return fs.readFileSync(fullPath)
}

/**
 * Gets target absolute upload path
 */
export function getUploadPath(fileInfo: FileInfo, isIncludeDirectoryName: boolean): string {
  return `/${isIncludeDirectoryName ? fileInfo.relativePathWithBase : fileInfo.relativePath}`
}
