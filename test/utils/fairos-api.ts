import axios, { AxiosResponse } from 'axios'
import FormData from 'form-data'

export class FairOSApi {
  public withCredentials = true

  public cookies = ''

  constructor(private apiUrlV1 = 'http://localhost:9090/') {
    axios.interceptors.request.use(config => {
      const url = config?.url

      if (this.cookies && config.headers && url?.indexOf('user/signup') === -1 && url?.indexOf('user/login') === -1) {
        config.headers.Cookie = this.cookies
      }

      return config
    })
    axios.interceptors.response.use(response => {
      if (this.withCredentials && response.headers['set-cookie']) {
        this.cookies = response.headers['set-cookie']?.[0] as string
      }

      return response
    })
  }

  private getV2Url(method: string) {
    return `${this.apiUrlV1}v2/${method}`
  }

  private getV1Url(method: string) {
    return `${this.apiUrlV1}v1/${method}`
  }

  /**
   * Register new V1 user
   */
  async registerV1(username: string, password: string, mnemonic?: string): Promise<AxiosResponse> {
    const url = this.getV1Url('user/signup')

    return await axios.post(url, {
      user_name: username,
      password,
      mnemonic,
    })
  }

  /**
   * Gets user stat
   */
  async stat(username: string): Promise<AxiosResponse> {
    const url = this.getV1Url('user/stat')

    return axios.get(url, {
      params: {
        user_name: username,
      },
    })
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<AxiosResponse> {
    const url = this.getV2Url('user/login')

    return await axios.post(url, {
      user_name: username,
      password,
    })
  }

  /**
   * Creates new user
   */
  async register(username: string, password: string, mnemonic: string): Promise<AxiosResponse> {
    const url = this.getV2Url('user/signup')

    return await axios.post(url, {
      user_name: username,
      password,
      mnemonic,
    })
  }

  /**
   * Gets pod list
   */
  async podLs(): Promise<AxiosResponse> {
    const url = this.getV1Url('pod/ls')

    return axios.get(url)
  }

  /**
   * Creates new pod
   *
   * @param name pod name
   * @param password account password
   */
  async podNew(name: string, password: string): Promise<AxiosResponse> {
    const url = this.getV1Url('pod/new')

    return axios.post(url, {
      pod_name: name,
      password,
    })
  }

  /**
   * Deletes a pod
   *
   * @param name pod name
   * @param password account password
   */
  async podDelete(name: string, password: string): Promise<AxiosResponse> {
    const url = this.getV1Url('pod/delete')

    return axios.delete(url, {
      data: {
        pod_name: name,
        password,
      },
    })
  }

  /**
   * Deletes a file
   *
   * @param name pod name
   * @param filePath file path
   */
  async fileDelete(name: string, filePath: string): Promise<AxiosResponse> {
    const url = this.getV1Url('file/delete')

    return axios.delete(url, {
      data: {
        pod_name: name,
        file_path: filePath,
      },
    })
  }

  /**
   * Deletes a directory
   *
   * @param name pod name
   * @param directoryPath directory path
   */
  async dirRmdir(name: string, directoryPath: string): Promise<AxiosResponse> {
    const url = this.getV1Url('dir/rmdir')

    return axios.delete(url, {
      data: {
        pod_name: name,
        dir_path: directoryPath,
      },
    })
  }

  /**
   * Opens a pod
   *
   * @param name pod name
   * @param password account password
   */
  async podOpen(name: string, password: string): Promise<AxiosResponse> {
    const url = this.getV1Url('pod/open')

    return axios.post(url, {
      pod_name: name,
      password,
    })
  }

  /**
   * Closes a pod
   *
   * @param name pod name
   */
  async podClose(name: string): Promise<AxiosResponse> {
    const url = this.getV1Url('pod/close')

    return axios.post(url, {
      pod_name: name,
    })
  }

  /**
   * Gets directories list
   */
  async dirLs(podName: string, dirPath = '/'): Promise<AxiosResponse> {
    const url = this.getV1Url('dir/ls')

    return axios.get(url, {
      params: {
        dir_path: dirPath,
        pod_name: podName,
      },
    })
  }

  /**
   * Gets information about shared file
   */
  async fileReceiveInfo(podName: string, sharingReference: string): Promise<AxiosResponse> {
    const url = this.getV1Url('file/receiveinfo')

    return axios.get(url, {
      params: {
        pod_name: podName,
        sharing_ref: sharingReference,
      },
    })
  }

  /**
   * Make a directory
   *
   * @param podName pod name
   * @param directoryPath directory path
   * @param password account password
   */
  async dirMkdir(podName: string, directoryPath: string, password: string): Promise<AxiosResponse> {
    const url = this.getV1Url('dir/mkdir')

    return axios.post(url, {
      pod_name: podName,
      dir_path: directoryPath,
      password,
    })
  }

  /**
   * Downloads a file
   *
   * @param podName pod name
   * @param filePath directory path
   */
  async fileDownload(podName: string, filePath: string): Promise<AxiosResponse> {
    const url = this.getV1Url('file/download')

    return axios.post(
      url,
      {},
      {
        params: {
          pod_name: podName,
          file_path: filePath,
        },
      },
    )
  }

  /**
   * Uploads a file
   *
   * @param podName pod name
   * @param dirPath directory path
   * @param content file content
   * @param fileName filename
   * @param blockSize block size of a file
   */
  async fileUpload(
    podName: string,
    dirPath: string,
    content: string,
    fileName: string,
    blockSize = '1Mb',
  ): Promise<AxiosResponse> {
    const url = this.getV1Url('file/upload')
    const form = new FormData()
    form.append('files', content, { filename: fileName })
    form.append('block_size', blockSize)
    form.append('pod_name', podName)
    form.append('dir_path', dirPath)
    return axios.post(url, form, { headers: form.getHeaders() })
  }
}
