/**
 * BrowserDepthGenerator - 浏览器版深度图生成器
 * 使用Replicate API在浏览器中生成深度图
 */

class BrowserDepthGenerator {
  constructor(apiToken) {
    this.apiToken = apiToken;
    this.baseUrl = 'https://api.replicate.com/v1';
    // 使用depth-anything-v2模型
    this.modelVersion = 'chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4';
  }

  /**
   * 验证API Token
   * @returns {Promise<boolean>} 是否有效
   */
  async validateToken() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * 生成深度图
   * @param {File} imageFile 图片文件
   * @param {Function} onProgress 进度回调
   * @returns {Promise<string>} 深度图的Data URL
   */
  async generateDepthMap(imageFile, onProgress = null) {
    console.log('🚀 开始生成深度图...');
    
    try {
      // 验证输入
      this.validateImageFile(imageFile);
      
      // 转换为base64
      if (onProgress) onProgress(10, '转换图片格式...');
      const base64Data = await this.fileToBase64(imageFile);
      
      // 创建预测任务
      if (onProgress) onProgress(20, '创建AI处理任务...');
      const prediction = await this.createPrediction(base64Data);
      
      // 轮询结果
      if (onProgress) onProgress(30, '等待AI处理...');
      const result = await this.pollPrediction(prediction.id, onProgress);
      
      // 下载深度图
      if (onProgress) onProgress(90, '下载深度图...');
      const depthImageUrl = await this.downloadDepthImage(result.output);
      
      if (onProgress) onProgress(100, '深度图生成完成！');
      console.log('✅ 深度图生成成功');
      
      return depthImageUrl;
      
    } catch (error) {
      console.error('❌ 深度图生成失败:', error);
      throw new Error(`深度图生成失败: ${error.message}`);
    }
  }

  /**
   * 验证图片文件
   * @param {File} file 文件对象
   */
  validateImageFile(file) {
    if (!file) {
      throw new Error('请选择图片文件');
    }
    
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支持的文件格式，请上传 JPG、PNG、BMP 或 WebP 格式的图片');
    }
    
    // 检查文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，请上传小于 10MB 的图片`);
    }
    
    console.log(`✓ 文件验证通过: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
  }

  /**
   * 将文件转换为base64
   * @param {File} file 文件对象
   * @returns {Promise<string>} base64字符串
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // 移除data:image/...;base64,前缀
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 创建预测任务
   * @param {string} base64Data base64图片数据
   * @returns {Promise<Object>} 预测任务对象
   */
  async createPrediction(base64Data) {
    const response = await fetch(`${this.baseUrl}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: this.modelVersion,
        input: {
          image: `data:image/jpeg;base64,${base64Data}`
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `API请求失败 (${response.status})`);
    }

    const prediction = await response.json();
    console.log('✓ 预测任务创建成功:', prediction.id);
    return prediction;
  }

  /**
   * 轮询预测结果
   * @param {string} predictionId 预测任务ID
   * @param {Function} onProgress 进度回调
   * @returns {Promise<Object>} 预测结果
   */
  async pollPrediction(predictionId, onProgress = null) {
    const maxAttempts = 60; // 最多等待5分钟
    const pollInterval = 5000; // 5秒轮询一次
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`获取预测结果失败 (${response.status})`);
      }

      const prediction = await response.json();
      
      if (prediction.status === 'succeeded') {
        console.log('✓ AI处理完成');
        return prediction;
      }
      
      if (prediction.status === 'failed') {
        throw new Error(prediction.error || 'AI处理失败');
      }
      
      if (prediction.status === 'canceled') {
        throw new Error('AI处理被取消');
      }
      
      // 更新进度
      if (onProgress) {
        const progress = Math.min(30 + (attempt / maxAttempts) * 50, 80);
        onProgress(progress, `AI处理中... (${attempt + 1}/${maxAttempts})`);
      }
      
      // 等待下次轮询
      await this.sleep(pollInterval);
    }
    
    throw new Error('AI处理超时，请稍后重试');
  }

  /**
   * 下载深度图
   * @param {string|Object} output API输出结果
   * @returns {Promise<string>} 深度图的Data URL
   */
  async downloadDepthImage(output) {
    let imageUrl;
    
    // 处理不同的输出格式
    if (typeof output === 'string') {
      imageUrl = output;
    } else if (output && output.depth) {
      imageUrl = output.depth;
    } else if (output && output.grey_depth) {
      imageUrl = output.grey_depth;
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0];
    } else {
      throw new Error('API返回的深度图格式不正确');
    }
    
    if (!imageUrl) {
      throw new Error('未找到深度图URL');
    }
    
    console.log('📥 下载深度图:', imageUrl);
    
    // 下载图片并转换为Data URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`深度图下载失败 (${response.status})`);
    }
    
    const blob = await response.blob();
    return this.blobToDataUrl(blob);
  }

  /**
   * 将Blob转换为Data URL
   * @param {Blob} blob Blob对象
   * @returns {Promise<string>} Data URL
   */
  async blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Blob转换失败'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 休眠函数
   * @param {number} ms 毫秒数
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取支持的模型列表
   * @returns {Promise<Array>} 模型列表
   */
  async getSupportedModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`获取模型列表失败 (${response.status})`);
      }
      
      const data = await response.json();
      return data.results.filter(model => 
        model.name.toLowerCase().includes('depth') ||
        model.description.toLowerCase().includes('depth')
      );
    } catch (error) {
      console.warn('获取模型列表失败:', error);
      return [];
    }
  }

  /**
   * 估算处理费用
   * @param {File} imageFile 图片文件
   * @returns {number} 预估费用（美元）
   */
  estimateCost(imageFile) {
    // 基于文件大小和分辨率的简单估算
    const sizeInMB = imageFile.size / (1024 * 1024);
    const baseCost = 0.01; // 基础费用
    const sizeFactor = Math.max(1, sizeInMB / 2); // 大文件额外费用
    
    return Math.round((baseCost * sizeFactor) * 100) / 100; // 保留2位小数
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserDepthGenerator;
} else {
  window.BrowserDepthGenerator = BrowserDepthGenerator;
}