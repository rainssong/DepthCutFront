/**
 * BrowserDepthCutter - 浏览器版深度切分器
 * 使用Canvas API进行深度图像切分
 */

class BrowserDepthCutter {
  constructor(layerCount = 8, depthOverlap = 1, borderWidth = 0) {
    this.layerCount = layerCount;
    this.depthOverlap = depthOverlap;
    this.borderWidth = borderWidth;
    this.depthRanges = this.generateDepthRanges(layerCount, depthOverlap);
    this.imageProcessor = new BrowserImageProcessor();
    this.results = [];
  }

  /**
   * 动态生成深度范围数组
   * @param {number} layerCount 层级数量
   * @param {number} depthOverlap 深度冗余
   * @returns {Array<{min: number, max: number}>} 深度范围数组
   */
  generateDepthRanges(layerCount, depthOverlap = 1) {
    const ranges = [];
    const maxDepth = 100;
    const stepSize = maxDepth / layerCount;
    
    for (let i = 0; i < layerCount; i++) {
      let minDepth = Math.round(stepSize * i * 10) / 10;
      let maxDepth = Math.round(stepSize * (i + 1) * 10) / 10;
      
      // 应用深度冗余 - 由底部向上冗余（只向最大值方向扩展）
      if (i < layerCount - 1) {
        maxDepth = Math.min(100, maxDepth + depthOverlap);
      }
      
      // 保留1位小数
      minDepth = Math.round(minDepth * 10) / 10;
      maxDepth = Math.round(maxDepth * 10) / 10;
      
      ranges.push({ min: minDepth, max: maxDepth });
    }
    
    return ranges;
  }

  /**
   * 处理图像切分
   * @param {File} imageFile 原始图片文件
   * @param {string|File} depthSource 深度图源（Data URL或文件）
   * @param {Function} onProgress 进度回调
   * @returns {Promise<Array>} 切分结果数组
   */
  async process(imageFile, depthSource, onProgress = null) {
    console.log('🚀 开始深度切分处理...');
    console.log(`层级数量: ${this.layerCount}`);
    console.log(`深度范围: [${this.depthRanges.map(r => `${r.min}~${r.max}`).join(', ')}]`);
    
    try {
      // 步骤1: 加载图像
      if (onProgress) onProgress(10, '加载图像...');
      const originalImg = await this.imageProcessor.loadImageFromFile(imageFile);
      
      let depthImg;
      if (typeof depthSource === 'string') {
        // Data URL
        depthImg = await this.imageProcessor.loadImageFromDataUrl(depthSource);
      } else {
        // File对象
        depthImg = await this.imageProcessor.loadImageFromFile(depthSource);
      }
      
      // 显示图像信息
      this.imageProcessor.showImageInfo(originalImg, depthImg);
      
      // 步骤2: 调整深度图尺寸
      if (onProgress) onProgress(20, '调整图像尺寸...');
      const adjustedDepthCanvas = this.imageProcessor.autoAdjustDepthImage(originalImg, depthImg);
      
      // 步骤3: 转换深度数据
      if (onProgress) onProgress(30, '转换深度数据...');
      const depthData = this.imageProcessor.convertDepthImageToData(adjustedDepthCanvas);
      
      // 步骤4: 处理每个层级
      this.results = [];
      const totalLayers = this.depthRanges.length;
      
      for (let i = 0; i < totalLayers; i++) {
        const range = this.depthRanges[i];
        const progress = 30 + ((i + 1) / totalLayers) * 60;
        
        if (onProgress) {
          onProgress(progress, `处理层级 ${i + 1}/${totalLayers} (深度 ${range.min}~${range.max})...`);
        }
        
        // 按深度范围切分
        console.log(`层级 ${i + 1}: 深度 ${range.min}~${range.max}`);
        let resultCanvas = this.imageProcessor.cutByDepthRange(originalImg, depthData, range.min, range.max);
        
        // 添加边框（如果设置了边框宽度）
        if (this.borderWidth > 0) {
          console.log(`添加 ${this.borderWidth}px 边框到层级 ${i + 1}`);
          resultCanvas = this.imageProcessor.addBorder(resultCanvas, this.borderWidth);
        }
        
        // 生成文件名 - 使用简单的数字序列格式
        const filename = `${String(i).padStart(4, '0')}.png`;
        
        // 转换为Data URL和Blob
        const dataUrl = this.imageProcessor.canvasToDataUrl(resultCanvas);
        const blob = await this.imageProcessor.canvasToBlob(resultCanvas);
        
        // 创建预览
        const preview = this.imageProcessor.createPreview(resultCanvas, 150, 150);
        const previewDataUrl = this.imageProcessor.canvasToDataUrl(preview);
        
        this.results.push({
          layer: i + 1,
          depthRange: `${range.min}~${range.max}`,
          filename,
          canvas: resultCanvas,
          dataUrl,
          blob,
          previewDataUrl,
          size: blob.size
        });
      }
      
      if (onProgress) onProgress(100, '处理完成！');
      
      console.log(`✅ 深度切分完成，生成 ${this.results.length} 个层级文件`);
      return this.results;
      
    } catch (error) {
      console.error('❌ 深度切分失败:', error);
      throw new Error(`深度切分失败: ${error.message}`);
    }
  }

  /**
   * 获取文件基础名称（不含扩展名）
   * @param {string} filename 文件名
   * @returns {string} 基础名称
   */
  getBaseName(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  }

  /**
   * 下载单个文件
   * @param {number} layerIndex 层级索引
   */
  async downloadLayer(layerIndex) {
    if (layerIndex < 0 || layerIndex >= this.results.length) {
      throw new Error('无效的层级索引');
    }
    
    const result = this.results[layerIndex];
    await this.imageProcessor.downloadCanvas(result.canvas, result.filename);
    console.log(`✓ 下载完成: ${result.filename}`);
  }

  /**
   * 下载所有文件（打包为ZIP）
   * @returns {Promise<Blob>} ZIP文件Blob
   */
  async downloadAllAsZip() {
    // 注意：这里需要引入JSZip库
    if (typeof JSZip === 'undefined') {
      throw new Error('需要JSZip库支持批量下载功能');
    }
    
    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 添加所有文件到ZIP
    for (const result of this.results) {
      zip.file(result.filename, result.blob);
    }
    
    // 生成ZIP文件
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // 下载ZIP文件
    const zipFilename = `DepthCut_${timestamp}.zip`;
    const url = URL.createObjectURL(zipBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    console.log(`✓ 批量下载完成: ${zipFilename}`);
    return zipBlob;
  }

  /**
   * 下载选中的文件（打包为ZIP）
   * @param {Array<number>} selectedIndices 选中的层级索引数组
   * @returns {Promise<Blob>} ZIP文件Blob
   */
  async downloadSelectedAsZip(selectedIndices) {
    // 注意：这里需要引入JSZip库
    if (typeof JSZip === 'undefined') {
      throw new Error('需要JSZip库支持批量下载功能');
    }
    
    if (!selectedIndices || selectedIndices.length === 0) {
      throw new Error('请选择要下载的文件');
    }
    
    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 添加选中的文件到ZIP
    for (const index of selectedIndices) {
      if (index >= 0 && index < this.results.length) {
        const result = this.results[index];
        zip.file(result.filename, result.blob);
      }
    }
    
    // 生成ZIP文件
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // 下载ZIP文件
    const zipFilename = `DepthCut_Selected_${timestamp}.zip`;
    const url = URL.createObjectURL(zipBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    console.log(`✓ 选中文件下载完成: ${zipFilename} (${selectedIndices.length} 个文件)`);
    return zipBlob;
  }

  /**
   * 获取处理结果统计
   * @returns {Object} 统计信息
   */
  getStats() {
    if (this.results.length === 0) {
      return null;
    }
    
    const totalSize = this.results.reduce((sum, result) => sum + result.size, 0);
    const avgSize = totalSize / this.results.length;
    
    return {
      totalLayers: this.results.length,
      totalSize: totalSize,
      avgSize: Math.round(avgSize),
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      depthRanges: this.depthRanges.slice()
    };
  }

  /**
   * 清理结果数据
   */
  cleanup() {
    this.results = [];
    console.log('✓ 结果数据已清理');
  }

  /**
   * 预览特定层级
   * @param {number} layerIndex 层级索引
   * @param {HTMLElement} container 预览容器
   */
  previewLayer(layerIndex, container) {
    if (layerIndex < 0 || layerIndex >= this.results.length) {
      throw new Error('无效的层级索引');
    }
    
    const result = this.results[layerIndex];
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建预览图像
    const img = document.createElement('img');
    img.src = result.previewDataUrl;
    img.alt = `Layer ${result.layer}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    
    container.appendChild(img);
  }

  /**
   * 获取层级结果
   * @param {number} layerIndex 层级索引
   * @returns {Object} 层级结果
   */
  getLayerResult(layerIndex) {
    if (layerIndex < 0 || layerIndex >= this.results.length) {
      return null;
    }
    
    return this.results[layerIndex];
  }

  /**
   * 获取所有结果
   * @returns {Array} 所有结果
   */
  getAllResults() {
    return this.results.slice(); // 返回副本
  }

  /**
   * 验证输入参数
   * @param {File} imageFile 图片文件
   * @param {string|File} depthSource 深度图源
   */
  validateInputs(imageFile, depthSource) {
    if (!imageFile || !(imageFile instanceof File)) {
      throw new Error('请提供有效的原始图片文件');
    }
    
    if (!depthSource) {
      throw new Error('请提供深度图');
    }
    
    if (typeof depthSource !== 'string' && !(depthSource instanceof File)) {
      throw new Error('深度图必须是Data URL字符串或File对象');
    }
    
    // 验证图片文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      throw new Error('不支持的图片格式，请上传 JPG、PNG、BMP 或 WebP 格式的图片');
    }
    
    if (depthSource instanceof File && !allowedTypes.includes(depthSource.type)) {
      throw new Error('不支持的深度图格式，请上传 JPG、PNG、BMP 或 WebP 格式的图片');
    }
    
    console.log('✓ 输入验证通过');
  }

  /**
   * 估算处理时间
   * @param {File} imageFile 图片文件
   * @returns {number} 预估时间（秒）
   */
  estimateProcessingTime(imageFile) {
    const sizeInMB = imageFile.size / (1024 * 1024);
    const baseTime = 2; // 基础处理时间
    const sizeTime = sizeInMB * 0.5; // 基于文件大小的额外时间
    const layerTime = this.layerCount * 0.1; // 基于层级数量的额外时间
    
    return Math.round(baseTime + sizeTime + layerTime);
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserDepthCutter;
} else {
  window.BrowserDepthCutter = BrowserDepthCutter;
}