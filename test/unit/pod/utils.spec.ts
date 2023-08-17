import { isPod, isSharedPod } from '../../../src/pod/utils'
import { Utils } from '@ethersphere/bee-js'
import { POD_PASSWORD_LENGTH } from '../../../src/utils/encryption'

describe('pod/utils', () => {
  it('isSharedPod', () => {
    const correctPassword = new Uint8Array([
      13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11, 61,
      162, 46, 138, 61, 6,
    ])
    const longPassword = new Uint8Array([
      13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11, 61,
      162, 46, 138, 61, 6, 1,
    ])
    const shortPassword = new Uint8Array([
      13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36, 12, 23, 38, 126, 130, 42, 11, 61,
      162, 46, 138, 61,
    ])
    const correctAddress = new Uint8Array([
      132, 13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36,
    ])
    const longAddress = new Uint8Array([
      1, 132, 13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36,
    ])
    const shortAddress = new Uint8Array([
      13, 92, 146, 84, 121, 12, 23, 38, 126, 130, 42, 11, 61, 162, 46, 138, 61, 6, 36,
    ])
    const examples = [
      {
        name: 'Hello world',
        address: Utils.hexToBytes('840D5c9254790c17267E822a0b3Da22e8a3D0624'),
        password: correctPassword,
        isCorrect: true,
      },
      {
        name: 'Hello world',
        // without conversion
        address: correctAddress,
        password: correctPassword,
        isCorrect: true,
      },
      {
        name: 'Hello world',
        // one byte more than address
        address: longAddress,
        password: correctPassword,
        isCorrect: false,
      },
      {
        name: 'Hello world',
        // one byte less than address
        address: shortAddress,
        password: correctPassword,
        isCorrect: false,
      },
      {
        name: 'Hello world',
        address: correctAddress,
        // password one byte more
        password: longPassword,
        isCorrect: false,
      },
      {
        name: 'Hello world',
        address: correctAddress,
        // password one byte less
        password: shortPassword,
        isCorrect: false,
      },
    ]

    for (const example of examples) {
      if (example.isCorrect) {
        expect(isSharedPod(example)).toBeTruthy()
      } else {
        expect(isSharedPod(example)).toBeFalsy()
      }
    }
  })

  it('isPod', () => {
    const goodPod = {
      name: 'Hello',
      password: new Uint8Array(POD_PASSWORD_LENGTH),
      index: 0,
    }
    const badPod = {
      password: new Uint8Array(POD_PASSWORD_LENGTH),
      index: 0,
    }
    expect(isPod(goodPod)).toBeTruthy()
    expect(isPod({})).toBeFalsy()
    expect(
      isPod({
        password: badPod.password,
      }),
    ).toBeFalsy()
    expect(
      isPod({
        index: badPod.index,
      }),
    ).toBeFalsy()
    expect(isPod(badPod)).toBeFalsy()
  })
})
