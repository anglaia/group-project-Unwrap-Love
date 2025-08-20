export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private timeoutId: NodeJS.Timeout | null = null
  private maxRecordingTime = 0 // 将最大录音时间设为 0，表示无限制

  // Start recording
  async startRecording(): Promise<void> {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser doesn't support audio recording")
      }

      // 检测是否为Safari浏览器
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      console.log(`[AudioRecorder] 浏览器检测: ${isSafari ? 'Safari' : '其他浏览器'}`);

      // Request microphone access permission with constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      // Create media recorder with format options for Safari compatibility
      let options = {};

      if (isSafari) {
        // Safari支持更好的音频格式
        try {
          // 尝试使用mp4作为首选格式
          if (MediaRecorder.isTypeSupported('audio/mp4')) {
            options = { mimeType: 'audio/mp4' };
            console.log('[AudioRecorder] 使用 audio/mp4 格式录音');
          }
          // 备选AAC格式
          else if (MediaRecorder.isTypeSupported('audio/aac')) {
            options = { mimeType: 'audio/aac' };
            console.log('[AudioRecorder] 使用 audio/aac 格式录音');
          }
          // 再备选mp3格式
          else if (MediaRecorder.isTypeSupported('audio/mp3')) {
            options = { mimeType: 'audio/mp3' };
            console.log('[AudioRecorder] 使用 audio/mp3 格式录音');
          }
          // 最后尝试最通用的格式
          else if (MediaRecorder.isTypeSupported('audio/wav')) {
            options = { mimeType: 'audio/wav' };
            console.log('[AudioRecorder] 使用 audio/wav 格式录音');
          }
          else {
            console.log('[AudioRecorder] Safari不支持指定的音频格式，使用默认格式');
          }
        } catch (e) {
          console.warn('[AudioRecorder] 检查格式支持时出错:', e);
        }
      } else {
        // Chrome和其他浏览器优先使用webm
        try {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            options = { mimeType: 'audio/webm' };
            console.log('[AudioRecorder] 使用 audio/webm 格式录音');
          }
        } catch (e) {
          console.warn('[AudioRecorder] 检查webm支持时出错:', e);
        }
      }

      // Create media recorder with options
      this.mediaRecorder = new MediaRecorder(this.stream, options)
      this.audioChunks = []

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      // Start recording
      this.mediaRecorder.start()
      console.log(`[AudioRecorder] 录音开始，使用MIME类型: ${this.mediaRecorder.mimeType}`);

      // 移除自动停止的计时器设置
    } catch (error: any) {
      // Handle specific permission errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.error("Microphone permission denied. Please allow microphone access in your browser settings.", error)
        throw new Error("Microphone permission denied. Please allow microphone access in your browser settings.")
      } else if (error.name === 'NotFoundError') {
        console.error("No microphone device found. Please connect a microphone and try again.", error)
        throw new Error("No microphone device found. Please connect a microphone and try again.")
      } else {
        console.error("Error starting recording:", error)
        throw error
      }
    }
  }

  // 新增：取消录音方法 - 停止录音但不上传到服务器
  async cancelRecording(): Promise<void> {
    if (!this.mediaRecorder) {
      throw new Error("No ongoing recording");
    }

    // Clear timeout timer if it exists
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    return new Promise<void>((resolve, reject) => {
      const mediaRecorder = this.mediaRecorder!;

      mediaRecorder.onstop = () => {
        try {
          // 清空音频数据
          this.audioChunks = [];

          // 停止所有音频轨道
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          this.mediaRecorder = null;
          resolve();
        } catch (error) {
          console.error("Error canceling recording:", error);
          reject(error);
        }
      };

      // 停止录音
      mediaRecorder.stop();
    });
  }

  // Stop recording, upload to server, and return audio URL
  async stopRecording(): Promise<string> {
    if (!this.mediaRecorder) {
      throw new Error("No ongoing recording");
    }

    // Clear timeout timer if it exists
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    return new Promise((resolve, reject) => {
      const mediaRecorder = this.mediaRecorder!;
      const mimeType = mediaRecorder.mimeType || 'audio/webm';

      mediaRecorder.onstop = async () => {
        try {
          // 检测是否为Safari浏览器
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

          // 创建正确MIME类型的Blob
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          console.log(`[AudioRecorder] 音频录制完成: ${audioBlob.size} 字节, 类型: ${mimeType}`);

          // 上传到服务器
          const serverUrl = await this.uploadAudioToServer(audioBlob);

          // Stop all stream tracks
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          this.mediaRecorder = null;
          resolve(serverUrl);
        } catch (error) {
          console.error("[AudioRecorder] 处理音频时出错:", error);

          // 如果上传失败，返回本地 blob URL 作为备用
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioUrl = URL.createObjectURL(new Blob(this.audioChunks, { type: mimeType }));
          console.warn("[AudioRecorder] 上传到服务器失败，使用本地URL:", audioUrl);

          // Stop all stream tracks
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          this.mediaRecorder = null;
          resolve(audioUrl);
        }
      };

      // Stop recording
      mediaRecorder.stop();
    });
  }

  // Helper method to upload audio to server
  private async uploadAudioToServer(audioBlob: Blob): Promise<string> {
    const maxRetries = 3;
    let retryCount = 0;

    // 获取MIME类型
    const mimeType = audioBlob.type || 'audio/webm';

    // 确定文件扩展名
    let fileExtension = 'webm';
    if (mimeType.includes('mp4')) fileExtension = 'mp4';
    else if (mimeType.includes('mp3')) fileExtension = 'mp3';
    else if (mimeType.includes('aac')) fileExtension = 'aac';
    else if (mimeType.includes('wav')) fileExtension = 'wav';

    // 使用简单版本的上传方法
    while (retryCount < maxRetries) {
      try {
        console.log(`[AudioRecorder] 上传音频到服务器 (尝试 ${retryCount + 1}/${maxRetries})...`);

        // Import dynamically to avoid circular dependency
        const { getApiUrl, API_BASE_URL } = await import('@/config/apiConfig');

        // 创建FormData
        const formData = new FormData();
        const file = new File([audioBlob], `audio.${fileExtension}`, { type: mimeType });
        formData.append("audio", file);

        console.log(`[AudioRecorder] 上传文件大小: ${file.size} 字节, 类型: ${mimeType}, 到 ${getApiUrl("/api/upload/audio")}`);

        // 使用fetch代替XMLHttpRequest，同时设置更严格的选项
        const response = await fetch(getApiUrl("/api/upload/audio"), {
          method: "POST",
          body: formData,
          // 不使用credentials: 'include'来避免CORS问题
          credentials: 'same-origin',
          mode: 'cors',
          cache: 'no-cache'
        });

        if (!response.ok) {
          throw new Error(`服务器返回状态 ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        let url = data.url;

        // 确保URL格式正确
        if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:')) {
          // 如果返回的是相对路径，构建完整URL
          url = `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
        }

        console.log("[AudioRecorder] 音频上传成功:", url);
        return url;
      } catch (error) {
        retryCount++;
        console.error(`[AudioRecorder] 音频上传尝试 ${retryCount} 失败:`, error);

        if (retryCount >= maxRetries) {
          console.error("[AudioRecorder] 所有上传尝试都失败。使用本地Blob URL作为备用。");
          throw error;
        }

        // 等待重试前的延迟时间随重试次数增加
        const delay = retryCount * 1000;
        console.log(`[AudioRecorder] 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 这一行永远不会执行，但TypeScript需要
    throw new Error("所有上传尝试都失败");
  }

  // Check if currently recording
  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === "recording"
  }

  // Get maximum recording time
  getMaxRecordingTime(): number {
    return this.maxRecordingTime
  }
}

export default new AudioRecorder()

