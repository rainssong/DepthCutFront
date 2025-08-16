/**
 * BrowserImageProcessor - 浏览器版图像处理器
 * 使用Canvas API进行图像处理
 */

class BrowserImageProcessor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * 创建Canvas元素
   * @param {number} width 宽度
   * @param {number} height 高度
   * @returns {HTMLCanvasElement} Canvas元素
   */
  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * 从文件加载图像
   * @param {File} file 图片文件
   * @returns {Promise<HTMLImageElement>} 图像元素
   */
  async loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 从Data URL加载图像
   * @param {string} dataUrl Data URL
   * @returns {Promise<HTMLImageElement>} 图像元素
   */
  async loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = dataUrl;
    });
  }

  /**
   * 获取图像数据
   * @param {HTMLImageElement} img 图像元素
   * @returns {ImageData} 图像数据
   */
  getImageData(img) {
    const canvas = this.createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
  }

  /**
   * 将图像数据转换为Canvas
   * @param {ImageData} imageData 图像数据
   * @returns {HTMLCanvasElement} Canvas元素
   */
  imageDataToCanvas(imageData) {
    const canvas = this.createCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * 调整图像尺寸
   * @param {HTMLImageElement} img 原始图像
   * @param {number} targetWidth 目标宽度
   * @param {number} targetHeight 目标高度
   * @returns {HTMLCanvasElement} 调整后的Canvas
   */
  resizeImage(img, targetWidth, targetHeight) {
    const canvas = this.createCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    
    // 使用高质量缩放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    return canvas;
  }

  /**
   * 检查两个图像尺寸是否匹配
   * @param {HTMLImageElement} img1 图像1
   * @param {HTMLImageElement} img2 图像2
   * @returns {boolean} 是否匹配
   */
  checkSizeMatch(img1, img2) {
    return img1.width === img2.width && img1.height === img2.height;
  }

  /**
   * 自动调整深度图尺寸以匹配原始图像
   * @param {HTMLImageElement} originalImg 原始图像
   * @param {HTMLImageElement} depthImg 深度图像
   * @returns {HTMLCanvasElement} 调整后的深度图Canvas
   */
  autoAdjustDepthImage(originalImg, depthImg) {
    console.log(`📐 调整深度图尺寸: ${depthImg.width}×${depthImg.height} -> ${originalImg.width}×${originalImg.height}`);
    
    if (this.checkSizeMatch(originalImg, depthImg)) {
      // 尺寸已匹配，直接转换为Canvas
      const canvas = this.createCanvas(depthImg.width, depthImg.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(depthImg, 0, 0);
      return canvas;
    }
    
    // 调整尺寸
    return this.resizeImage(depthImg, originalImg.width, originalImg.height);
  }

  /**
   * 将深度图转换为深度数据数组
   * @param {HTMLImageElement|HTMLCanvasElement} depthImg 深度图像
   * @returns {number[][]} 深度数据数组 (0-100)
   */
  convertDepthImageToData(depthImg) {
    const canvas = depthImg instanceof HTMLCanvasElement ? 
      depthImg : 
      (() => {
        const c = this.createCanvas(depthImg.width, depthImg.height);
        const ctx = c.getContext('2d');
        ctx.drawImage(depthImg, 0, 0);
        return c;
      })();
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const width = canvas.width;
    const height = canvas.height;
    const depthData = [];
    
    console.log(`🔄 转换深度数据 (${width}×${height})...`);
    
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        // 使用R通道作为灰度值，转换为0-100范围的深度值
        const gray = data[index];
        const depth = (gray / 255) * 100;
        row.push(depth);
      }
      depthData.push(row);
    }
    
    console.log('✓ 深度数据转换完成');
    return depthData;
  }

  /**
   * 根据深度阈值切分图像
   * @param {HTMLImageElement} originalImg 原始图像
   * @param {number[][]} depthData 深度数据数组
   * @param {number} threshold 深度阈值 (0-100)
   * @returns {HTMLCanvasElement} 切分后的Canvas
   */
  cutByDepthThreshold(originalImg, depthData, threshold) {
    const canvas = this.createCanvas(originalImg.width, originalImg.height);
    const ctx = canvas.getContext('2d');
    
    // 绘制原始图像
    ctx.drawImage(originalImg, 0, 0);
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // 遍历每个像素，根据深度阈值设置透明度
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const depth = depthData[y][x];
        const index = (y * width + x) * 4;
        
        // 如果深度值小于阈值，设置为透明
        if (depth < threshold) {
          data[index + 3] = 0; // Alpha通道设为0（透明）
        }
      }
    }
    
    // 将修改后的数据放回Canvas
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
  }

  /**
   * 根据深度范围切分图像
   * @param {HTMLImageElement} originalImg 原始图像
   * @param {number[][]} depthData 深度数据数组
   * @param {number} minDepth 最小深度值 (0-100)
   * @param {number} maxDepth 最大深度值 (0-100)
   * @returns {HTMLCanvasElement} 切分后的Canvas
   */
  cutByDepthRange(originalImg, depthData, minDepth, maxDepth) {
    const canvas = this.createCanvas(originalImg.width, originalImg.height);
    const ctx = canvas.getContext('2d');
    
    // 绘制原始图像
    ctx.drawImage(originalImg, 0, 0);
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // 遍历每个像素，根据深度范围设置透明度
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const depth = depthData[y][x];
        const index = (y * width + x) * 4;
        
        // 如果深度值不在指定范围内，设置为透明
        if (depth < minDepth || depth >= maxDepth) {
          data[index + 3] = 0; // Alpha通道设为0（透明）
        }
      }
    }
    
    // 将修改后的数据放回Canvas
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
  }

  /**
   * 将Canvas转换为Blob
   * @param {HTMLCanvasElement} canvas Canvas元素
   * @param {string} type MIME类型
   * @param {number} quality 质量 (0-1)
   * @returns {Promise<Blob>} Blob对象
   */
  async canvasToBlob(canvas, type = 'image/png', quality = 0.9) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas转换为Blob失败'));
        }
      }, type, quality);
    });
  }

  /**
   * 将Canvas转换为Data URL
   * @param {HTMLCanvasElement} canvas Canvas元素
   * @param {string} type MIME类型
   * @param {number} quality 质量 (0-1)
   * @returns {string} Data URL
   */
  canvasToDataUrl(canvas, type = 'image/png', quality = 0.9) {
    return canvas.toDataURL(type, quality);
  }

  /**
   * 下载Canvas为文件
   * @param {HTMLCanvasElement} canvas Canvas元素
   * @param {string} filename 文件名
   * @param {string} type MIME类型
   */
  async downloadCanvas(canvas, filename, type = 'image/png') {
    const blob = await this.canvasToBlob(canvas, type);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * 创建图像预览
   * @param {HTMLCanvasElement|HTMLImageElement} source 图像源
   * @param {number} maxWidth 最大宽度
   * @param {number} maxHeight 最大高度
   * @returns {HTMLCanvasElement} 预览Canvas
   */
  createPreview(source, maxWidth = 200, maxHeight = 200) {
    const sourceWidth = source.width || source.naturalWidth;
    const sourceHeight = source.height || source.naturalHeight;
    
    // 计算缩放比例
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
    const previewWidth = Math.floor(sourceWidth * scale);
    const previewHeight = Math.floor(sourceHeight * scale);
    
    const canvas = this.createCanvas(previewWidth, previewHeight);
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, previewWidth, previewHeight);
    
    return canvas;
  }

  /**
   * 获取图像信息
   * @param {HTMLImageElement|HTMLCanvasElement} img 图像
   * @returns {Object} 图像信息
   */
  getImageInfo(img) {
    const width = img.width || img.naturalWidth;
    const height = img.height || img.naturalHeight;
    const megapixels = (width * height) / 1000000;
    
    return {
      width,
      height,
      megapixels: Math.round(megapixels * 10) / 10,
      aspectRatio: Math.round((width / height) * 100) / 100
    };
  }

  /**
   * 显示图像信息
   * @param {HTMLImageElement} originalImg 原始图像
   * @param {HTMLImageElement} depthImg 深度图像
   */
  showImageInfo(originalImg, depthImg) {
    const originalInfo = this.getImageInfo(originalImg);
    const depthInfo = this.getImageInfo(depthImg);
    
    console.log('📐 图像信息:');
    console.log(`   原始图: ${originalInfo.width}×${originalInfo.height} (${originalInfo.megapixels}MP)`);
    console.log(`   深度图: ${depthInfo.width}×${depthInfo.height} (${depthInfo.megapixels}MP)`);
    
    if (this.checkSizeMatch(originalImg, depthImg)) {
      console.log('✅ 尺寸匹配');
    } else {
      console.log('⚠️  尺寸不匹配，将自动调整');
    }
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserImageProcessor;
} else {
  window.BrowserImageProcessor = BrowserImageProcessor;
}