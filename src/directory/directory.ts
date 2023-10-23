import { AccountData } from '../account/account-data'
import { createDirectory, readDirectory, DEFAULT_UPLOAD_DIRECTORY_OPTIONS, UploadDirectoryOptions } from './handler'
import { assertAccount } from '../account/utils'
import { removeEntryFromDirectory } from '../content-items/handler'
import { extractPathInfo, readBrowserFileAsBytes } from '../file/utils'
import { assertPodName, getExtendedPodsListByAccountData } from '../pod/utils'
import { isNode } from '../shim/utils'
import {
  assertBrowserFilesWithPath,
  filterBrowserRecursiveFiles,
  filterDotFiles,
  browserFileListToFileInfoList,
  getDirectoriesToCreate,
  getNodeFileContent,
  getNodeFileInfoList,
  getUploadPath,
  BrowserFileInfo,
  NodeFileInfo,
} from './utils'
import { uploadData } from '../file/handler'
import { assertNodeFileInfo, isBrowserFileInfo } from './types'
import { DirectoryItem } from '../content-items/types'

/**
 * Directory related class
 */
export class Directory {
  constructor(private accountData: AccountData) {}

  /**
   * Get files and directories under the given path
   *
   * Account is required, postage batch id is not required
   *
   * @param podName pod for content search
   * @param path path to start searching from
   * @param isRecursive search with recursion or not
   */
  async read(podName: string, path: string, isRecursive?: boolean): Promise<DirectoryItem> {
    assertAccount(this.accountData)
    assertPodName(podName)
    const { podAddress, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)

    return readDirectory(
      this.accountData.connection.bee,
      path,
      podAddress,
      pod.password,
      isRecursive,
      this.accountData.connection.options?.requestOptions,
    )
  }

  /**
   * Creates a directory
   *
   * Account and postage batch id are required
   *
   * @param podName pod where to create a directory
   * @param fullPath path for a directory
   */
  async create(podName: string, fullPath: string): Promise<void> {
    assertAccount(this.accountData, { writeRequired: true })
    assertPodName(podName)
    const { podWallet, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)

    return createDirectory(
      this.accountData.connection,
      fullPath,
      podWallet,
      pod.password,
      this.accountData.connection.options?.requestOptions,
    )
  }

  /**
   * Deletes a directory
   *
   * Account and postage batch id are required
   *
   * @param podName pod where to delete a directory
   * @param fullPath path for a directory
   */
  async delete(podName: string, fullPath: string): Promise<void> {
    assertAccount(this.accountData, { writeRequired: true })
    assertPodName(podName)
    const pathInfo = extractPathInfo(fullPath)
    const connection = this.accountData.connection
    const { podWallet, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)

    await removeEntryFromDirectory(
      connection,
      podWallet,
      pod.password,
      pathInfo.path,
      pathInfo.filename,
      false,
      connection.options?.requestOptions,
    )
  }

  /**
   * Uploads a directory with files
   *
   * Account and postage batch id are required
   *
   * @param podName pod where to upload a directory
   * @param filesSource files source. path for Node.js, `FileList` for browser
   * @param options upload directory options
   */
  async upload(podName: string, filesSource: string | FileList, options?: UploadDirectoryOptions): Promise<void> {
    assertAccount(this.accountData, { writeRequired: true })
    assertPodName(podName)
    const { podWallet, pod } = await getExtendedPodsListByAccountData(this.accountData, podName)
    options = { ...DEFAULT_UPLOAD_DIRECTORY_OPTIONS, ...options }

    const isNodePath = typeof filesSource === 'string'
    const isNodeEnv = isNode()

    if (!isNodeEnv && isNodePath) {
      throw new Error('Directory uploading with path as string is available in Node.js only')
    }

    let files: (BrowserFileInfo | NodeFileInfo)[]

    if (isNodePath) {
      files = await getNodeFileInfoList(filesSource, Boolean(options.isRecursive))
    } else {
      assertBrowserFilesWithPath(filesSource)
      files = browserFileListToFileInfoList(filesSource)

      if (!options.isRecursive) {
        files = filterBrowserRecursiveFiles(files as BrowserFileInfo[])
      }
    }

    if (options.excludeDotFiles) {
      files = filterDotFiles(files)
    }
    const directoriesToCreate = getDirectoriesToCreate(
      files.map(item => (options?.isIncludeDirectoryName ? item.relativePathWithBase : item.relativePath)),
    )
    for (const directory of directoriesToCreate) {
      try {
        await createDirectory(
          this.accountData.connection,
          directory,
          podWallet,
          pod.password,
          this.accountData.connection.options?.requestOptions,
        )
      } catch (e) {
        const error = e as Error

        if (!error.message.includes('already listed in the parent directory list')) {
          throw new Error(error.message)
        }
      }
    }

    for (const file of files) {
      let bytes

      if (isNodePath) {
        assertNodeFileInfo(file)
        bytes = getNodeFileContent(file.fullPath)
      } else if (!isNodePath && isBrowserFileInfo(file)) {
        bytes = await readBrowserFileAsBytes(file.browserFile)
      } else {
        throw new Error('Directory uploading: one of the files is not correct')
      }

      const uploadPath = getUploadPath(file, options.isIncludeDirectoryName!)
      await uploadData(podName, uploadPath, bytes, this.accountData, options.uploadOptions!)
    }
  }
}
