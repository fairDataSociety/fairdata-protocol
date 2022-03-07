import crypto from 'crypto'
import { keccak256, Message } from 'js-sha3'
import { Bytes } from '@ethersphere/bee-js/dist/src/utils/bytes'

const ALGORITHM = 'aes-256-cfb'

export function keccak256Hash(...messages: Message[]): Bytes<32> {
  const hasher = keccak256.create()

  messages.forEach(bytes => hasher.update(bytes))

  return Uint8Array.from(hasher.digest()) as Bytes<32>
}

/**
 * Decrypt text with password
 *
 * @param password
 * @param text
 */
export function decrypt(password: string, text: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  const keyBytes = hash.digest()

  const contents = Buffer.from(text, 'base64')
  const iv = contents.slice(0, 16)
  const textBytes = contents.slice(16)
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBytes, iv)
  // @ts-ignore function should be updated
  let res: string = decipher.update(textBytes, '', 'utf8')
  res += decipher.final('utf8')

  return res
}

/**
 * Encrypt text with password
 *
 * @param password
 * @param text
 */
export function encrypt(password: string, text: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  const keyBytes = hash.digest()

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, keyBytes, iv)
  const enc = [iv, cipher.update(text, 'utf8')]
  enc.push(cipher.final())

  return Buffer.concat(enc).toString('base64')
}
