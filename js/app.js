/**
 * DepthCut Frontend Application
 * 纯前端深度图像切分工具主应用
 */

class DepthCutFrontendApp {
  constructor() {
    this.currentMode = 'auto';
    this.files = {
      image: null,
      depth: null
    };
    this.apiToken = '';
    this.depthGenerator = null;
    this.depthCutter = null;
    this.currentResults = null;
    this.processingStartTime = null;
    
    this.init();
  }

  /**
   * 初始化应用
   */
  init() {
    this.loadApiToken();
    this.setupEventListeners();
    this.updateUI();
    console.log('DepthCut Frontend App initialized');
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // API Token相关
    const apiInput = document.getElementById('replicateApiKey');
    const toggleBtn = document.getElementById('toggleApiKey');
    
    apiInput.addEventListener('input', (e) => {
      this.handleApiTokenChange(e.target.value);
    });
    
    toggleBtn.addEventListener('click', () => {
      this.toggleApiKeyVisibility();
    });

    // 模式切换
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchMode(e.target.closest('.mode-btn').dataset.mode);
      });
    });

    // 文件上传
    document.getElementById('imageFile').addEventListener('change', (e) => {
      this.handleImageUpload(e.target.files[0]);
    });

    document.getElementById('depthFile').addEventListener('change', (e) => {
      this.handleDepthUpload(e.target.files[0]);
    });

    // 拖拽上传
    this.setupDragAndDrop();

    // 层级滑块
    const layerSlider = document.getElementById('layerCount');
    layerSlider.addEventListener('input', (e) => {
      this.updateLayerValue(e.target.value);
    });

    // 处理按钮
    document.getElementById('processBtn').addEventListener('click', () => {
      this.startProcessing();
    });

    // 模态框关闭
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target.id);
      }
    });
  }

  /**
   * 加载保存的API Token
   */
  loadApiToken() {
    const savedToken = localStorage.getItem('replicate_api_token');
    if (savedToken) {
      this.apiToken = savedToken;
      document.getElementById('replicateApiKey').value = savedToken;
      this.validateApiToken();
    }
  }

  /**
   * 处理API Token变化
   * @param {string} token API Token
   */
  async handleApiTokenChange(token) {
    this.apiToken = token.trim();
    
    if (this.apiToken) {
      // 保存到本地存储
      localStorage.setItem('replicate_api_token', this.apiToken);
      await this.validateApiToken();
    } else {
      // 清除本地存储
      localStorage.removeItem('replicate_api_token');
      this.updateApiStatus('offline', '未配置');
    }
    
    this.updateProcessButton();
  }

  /**
   * 验证API Token
   */
  async validateApiToken() {
    if (!this.apiToken) {
      this.updateApiStatus('offline', '未配置');
      return false;
    }

    try {
      this.updateApiStatus('offline', '验证中...');
      
      this.depthGenerator = new BrowserDepthGenerator(this.apiToken);
      const isValid = await this.depthGenerator.validateToken();
      
      if (isValid) {
        this.updateApiStatus('online', '已连接');
        return true;
      } else {
        this.updateApiStatus('error', '无效Token');
        this.depthGenerator = null;
        return false;
      }
    } catch (error) {
      console.error('API Token validation failed:', error);
      this.updateApiStatus('error', '验证失败');
      this.depthGenerator = null;
      return false;
    }
  }

  /**
   * 更新API状态显示
   * @param {string} status 状态：online/offline/error
   * @param {string} text 状态文本
   */
  updateApiStatus(status, text) {
    const indicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    indicator.className = `status-indicator ${status}`;
    statusText.textContent = text;
  }

  /**
   * 切换API密钥可见性
   */
  toggleApiKeyVisibility() {
    const input = document.getElementById('replicateApiKey');
    const btn = document.getElementById('toggleApiKey');
    
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁️';
    }
  }

  /**
   * 设置拖拽上传
   */
  setupDragAndDrop() {
    const uploadAreas = document.querySelectorAll('.upload-area');
    
    uploadAreas.forEach(area => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, this.preventDefaults, false);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        area.addEventListener(eventName, () => area.classList.add('dragover'), false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, () => area.classList.remove('dragover'), false);
      });

      area.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          if (area.id === 'imageUpload') {
            this.handleImageUpload(files[0]);
          } else if (area.id === 'depthUpload') {
            this.handleDepthUpload(files[0]);
          }
        }
      });
    });
  }

  /**
   * 阻止默认事件
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * 切换模式
   * @param {string} mode 模式：auto/manual
   */
  switchMode(mode) {
    this.currentMode = mode;
    
    // 更新按钮状态
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // 显示/隐藏深度图上传区域
    const depthUpload = document.getElementById('depthUpload');
    depthUpload.style.display = mode === 'manual' ? 'flex' : 'none';

    this.updateProcessButton();
    console.log(`Switched to ${mode} mode`);
  }

  /**
   * 处理图片上传
   * @param {File} file 图片文件
   */
  handleImageUpload(file) {
    if (!this.validateFile(file)) return;

    this.files.image = file;
    this.showImagePreview(file, 'imagePreview', 'imagePreviewImg', 'imageFileName');
    this.updateProcessButton();
    console.log('Image uploaded:', file.name);
  }

  /**
   * 处理深度图上传
   * @param {File} file 深度图文件
   */
  handleDepthUpload(file) {
    if (!this.validateFile(file)) return;

    this.files.depth = file;
    this.showImagePreview(file, 'depthPreview', 'depthPreviewImg', 'depthFileName');
    this.updateProcessButton();
    console.log('Depth image uploaded:', file.name);
  }

  /**
   * 验证文件
   * @param {File} file 文件对象
   * @returns {boolean} 是否有效
   */
  validateFile(file) {
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.showError('不支持的文件格式，请上传 JPG、PNG、BMP 或 WebP 格式的图片');
      return false;
    }

    // 检查文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showError('文件过大，请上传小于 10MB 的图片');
      return false;
    }

    return true;
  }

  /**
   * 显示图片预览
   * @param {File} file 文件对象
   * @param {string} previewId 预览容器ID
   * @param {string} imgId 图片元素ID
   * @param {string} nameId 文件名元素ID
   */
  showImagePreview(file, previewId, imgId, nameId) {
    const preview = document.getElementById(previewId);
    const img = document.getElementById(imgId);
    const nameSpan = document.getElementById(nameId);

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      nameSpan.textContent = file.name;
      preview.style.display = 'flex';
      preview.classList.add('fade-in');
    };
    reader.readAsDataURL(file);
  }

  /**
   * 移除图片
   */
  removeImage() {
    this.files.image = null;
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imageFile').value = '';
    this.updateProcessButton();
  }

  /**
   * 移除深度图
   */
  removeDepth() {
    this.files.depth = null;
    document.getElementById('depthPreview').style.display = 'none';
    document.getElementById('depthFile').value = '';
    this.updateProcessButton();
  }

  /**
   * 更新层级值显示
   * @param {string} value 层级值
   */
  updateLayerValue(value) {
    document.getElementById('layerValue').textContent = value;
    
    // 更新预设按钮状态
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // 如果是预设值，高亮对应按钮
    const presetValues = { 4: 0, 8: 1, 16: 2, 32: 3 };
    if (presetValues[value] !== undefined) {
      document.querySelectorAll('.preset-btn')[presetValues[value]].classList.add('active');
    }
  }

  /**
   * 设置层级数量
   * @param {number} count 层级数量
   */
  setLayers(count) {
    document.getElementById('layerCount').value = count;
    this.updateLayerValue(count);
  }

  /**
   * 更新处理按钮状态
   */
  updateProcessButton() {
    const processBtn = document.getElementById('processBtn');
    const processStatus = document.getElementById('processStatus');
    
    let canProcess = false;
    let statusText = '';

    // 检查API Token
    if (!this.apiToken && this.currentMode === 'auto') {
      statusText = '请先配置Replicate API Token';
    } else if (this.currentMode === 'auto') {
      canProcess = !!this.files.image && !!this.depthGenerator;
      statusText = !this.files.image ? 
        '请上传原始图片' : 
        !this.depthGenerator ?
          'API Token验证中...' :
          '准备就绪，点击开始处理';
    } else {
      canProcess = !!(this.files.image && this.files.depth);
      statusText = !this.files.image ? 
        '请上传原始图片' : 
        !this.files.depth ? 
          '请上传深度图' : 
          '准备就绪，点击开始处理';
    }

    processBtn.disabled = !canProcess;
    processStatus.textContent = statusText;
  }

  /**
   * 开始处理
   */
  async startProcessing() {
    if (!this.validateInputs()) return;

    this.processingStartTime = Date.now();
    this.showProgress();
    
    try {
      if (this.currentMode === 'auto') {
        await this.processAuto();
      } else {
        await this.processManual();
      }
    } catch (error) {
      console.error('Processing failed:', error);
      this.showError(error.message);
      this.hideProgress();
    }
  }

  /**
   * 验证输入
   * @returns {boolean} 是否有效
   */
  validateInputs() {
    if (!this.files.image) {
      this.showError('请上传原始图片');
      return false;
    }

    if (this.currentMode === 'auto' && !this.depthGenerator) {
      this.showError('请先配置有效的Replicate API Token');
      return false;
    }

    if (this.currentMode === 'manual' && !this.files.depth) {
      this.showError('手动模式需要上传深度图');
      return false;
    }

    return true;
  }

  /**
   * 自动模式处理
   */
  async processAuto() {
    const layers = parseInt(document.getElementById('layerCount').value);
    const depthOverlap = parseInt(document.getElementById('depthOverlap').value);
    
    // 步骤1: 生成深度图
    this.updateProgress(10, 1, '生成深度图...');
    
    const depthImageUrl = await this.depthGenerator.generateDepthMap(
      this.files.image,
      (progress, message) => {
        const adjustedProgress = 10 + (progress * 0.4); // 10-50%
        this.updateProgress(adjustedProgress, 1, message);
      }
    );
    
    // 显示生成的深度图
    this.showDepthResult(this.files.image, depthImageUrl);
    
    // 步骤2: 处理层级切分
    this.updateProgress(60, 2, '开始层级切分...');
    
    this.depthCutter = new BrowserDepthCutter(layers, depthOverlap);
    this.currentResults = await this.depthCutter.process(
      this.files.image,
      depthImageUrl,
      (progress, message) => {
        const adjustedProgress = 60 + (progress * 0.3); // 60-90%
        this.updateProgress(adjustedProgress, 2, message);
      }
    );
    
    // 步骤3: 完成
    this.updateProgress(100, 3, '处理完成！');
    
    setTimeout(() => {
      this.showResults();
    }, 1000);
  }

  /**
   * 手动模式处理
   */
  async processManual() {
    const layers = parseInt(document.getElementById('layerCount').value);
    const depthOverlap = parseInt(document.getElementById('depthOverlap').value);
    
    // 显示深度图对比
    this.updateProgress(20, 1, '准备图像...');
    this.showManualDepthResult();
    
    // 处理层级切分
    this.updateProgress(40, 2, '开始层级切分...');
    
    this.depthCutter = new BrowserDepthCutter(layers, depthOverlap);
    this.currentResults = await this.depthCutter.process(
      this.files.image,
      this.files.depth,
      (progress, message) => {
        const adjustedProgress = 40 + (progress * 0.5); // 40-90%
        this.updateProgress(adjustedProgress, 2, message);
      }
    );
    
    // 完成
    this.updateProgress(100, 3, '处理完成！');
    
    setTimeout(() => {
      this.showResults();
    }, 1000);
  }

  /**
   * 显示进度
   */
  showProgress() {
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('progressSection').classList.add('fade-in');
    this.updateProgress(0, 0, '准备开始处理...');
  }

  /**
   * 隐藏进度
   */
  hideProgress() {
    document.getElementById('progressSection').style.display = 'none';
  }

  /**
   * 更新进度
   * @param {number} percent 进度百分比
   * @param {number} step 当前步骤
   * @param {string} message 进度消息
   */
  updateProgress(percent, step, message) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = `${Math.round(percent)}%`;
    document.getElementById('progressDetails').textContent = message;

    // 更新步骤状态
    document.querySelectorAll('.step').forEach((stepEl, index) => {
      stepEl.classList.remove('active', 'completed');
      if (index < step) {
        stepEl.classList.add('completed');
      } else if (index === step) {
        stepEl.classList.add('active');
      }
    });
  }

  /**
   * 显示深度图结果（自动模式）
   * @param {File} originalFile 原始图片文件
   * @param {string} depthImageUrl 深度图URL
   */
  showDepthResult(originalFile, depthImageUrl) {
    const depthResult = document.getElementById('depthResult');
    const originalResult = document.getElementById('originalResult');
    const depthResultImg = document.getElementById('depthResultImg');

    // 显示原始图片
    const reader = new FileReader();
    reader.onload = (e) => {
      originalResult.src = e.target.result;
    };
    reader.readAsDataURL(originalFile);

    // 显示深度图
    depthResultImg.src = depthImageUrl;
    
    depthResult.style.display = 'block';
  }

  /**
   * 显示手动模式深度图结果
   */
  showManualDepthResult() {
    const depthResult = document.getElementById('depthResult');
    const originalResult = document.getElementById('originalResult');
    const depthResultImg = document.getElementById('depthResultImg');

    // 显示原始图片
    const reader1 = new FileReader();
    reader1.onload = (e) => {
      originalResult.src = e.target.result;
    };
    reader1.readAsDataURL(this.files.image);

    // 显示深度图
    const reader2 = new FileReader();
    reader2.onload = (e) => {
      depthResultImg.src = e.target.result;
    };
    reader2.readAsDataURL(this.files.depth);
    
    depthResult.style.display = 'block';
  }

  /**
   * 显示处理结果
   */
  showResults() {
    this.hideProgress();
    
    const resultsSection = document.getElementById('resultsSection');
    const resultLayers = document.getElementById('resultLayers');
    const resultTime = document.getElementById('resultTime');
    const filesGrid = document.getElementById('filesGrid');

    // 计算处理时间
    const processingTime = Math.round((Date.now() - this.processingStartTime) / 1000);

    // 更新统计信息
    resultLayers.textContent = this.currentResults.length;
    resultTime.textContent = `${processingTime}`;

    // 生成文件列表
    filesGrid.innerHTML = '';
    this.currentResults.forEach((result, index) => {
      const fileItem = this.createFileItem(result, index);
      filesGrid.appendChild(fileItem);
    });

    // 显示结果区域
    resultsSection.style.display = 'block';
    resultsSection.classList.add('fade-in');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * 创建文件项元素
   * @param {Object} result 结果对象
   * @param {number} index 索引
   * @returns {HTMLElement} 文件项元素
   */
  createFileItem(result, index) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    item.innerHTML = `
      <div class="file-preview">
        <img src="${result.previewDataUrl}" alt="Layer ${result.layer}" style="width: 100%; height: 100%; object-fit: contain; border-radius: var(--radius);">
      </div>
      <div class="file-info">
        层级 ${result.layer}<br>
        深度 ${result.depthRange}
      </div>
      <button class="file-download" onclick="app.downloadLayer(${index})">
        下载
      </button>
    `;

    return item;
  }

  /**
   * 下载单个层级
   * @param {number} index 层级索引
   */
  async downloadLayer(index) {
    try {
      await this.depthCutter.downloadLayer(index);
    } catch (error) {
      this.showError(`下载失败: ${error.message}`);
    }
  }

  /**
   * 下载所有文件
   */
  async downloadAllFiles() {
    try {
      const downloadBtn = document.getElementById('downloadAllBtn');
      const originalText = downloadBtn.innerHTML;
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<span class="btn-icon">⏳</span>正在打包...';

      await this.depthCutter.downloadAllAsZip();

      downloadBtn.disabled = false;
      downloadBtn.innerHTML = originalText;
    } catch (error) {
      console.error('Batch download failed:', error);
      this.showError(`批量下载失败: ${error.message}`);
      
      const downloadBtn = document.getElementById('downloadAllBtn');
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<span class="btn-icon">📦</span>下载所有文件';
    }
  }

  /**
   * 重置表单
   */
  resetForm() {
    // 重置文件
    this.files = { image: null, depth: null };
    this.currentResults = null;
    
    // 重置UI
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('depthPreview').style.display = 'none';
    document.getElementById('imageFile').value = '';
    document.getElementById('depthFile').value = '';
    
    // 隐藏结果区域
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('depthResult').style.display = 'none';
    
    // 重置设置
    this.setLayers(8);
    this.switchMode('auto');
    
    // 清理处理器
    if (this.depthCutter) {
      this.depthCutter.cleanup();
      this.depthCutter = null;
    }
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('Form reset');
  }

  /**
   * 显示错误信息
   * @param {string} message 错误消息
   */
  showError(message) {
    alert(`错误: ${message}`);
    console.error('Error:', message);
  }

  /**
   * 显示帮助
   */
  showHelp() {
    document.getElementById('helpModal').style.display = 'flex';
  }

  /**
   * 显示API帮助
   */
  showApiHelp() {
    document.getElementById('apiHelpModal').style.display = 'flex';
  }

  /**
   * 显示关于
   */
  showAbout() {
    document.getElementById('aboutModal').style.display = 'flex';
  }

  /**
   * 关闭模态框
   * @param {string} modalId 模态框ID
   */
  closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
  }

  /**
   * 更新UI
   */
  updateUI() {
    this.updateProcessButton();
  }
}

// 全局函数（供HTML调用）
function removeImage() {
  app.removeImage();
}

function removeDepth() {
  app.removeDepth();
}

function setLayers(count) {
  app.setLayers(count);
}

function resetForm() {
  app.resetForm();
}

function showHelp() {
  app.showHelp();
}

function showApiHelp() {
  app.showApiHelp();
}

function showAbout() {
  app.showAbout();
}

function closeModal(modalId) {
  app.closeModal(modalId);
}

function downloadAllFiles() {
  app.downloadAllFiles();
}

// 初始化应用
const app = new DepthCutFrontendApp();

// 页面加载完成后的额外初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DepthCut Frontend Interface loaded');
});