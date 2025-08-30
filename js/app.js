/**
 * DepthCut Frontend Application
 * 纯前端深度图像切分工具主应用
 */

class DepthCutFrontendApp {
  constructor() {
    this.currentMode = 'manual'; // 固定为手动模式
    this.files = {
      image: null,
      depth: null
    };
    this.apiToken = '';
    this.depthGenerator = null;
    this.depthCutter = null;
    this.currentResults = null;
    this.processingStartTime = null;
    this.threeDPreview = null;
    this.isGeneratingDepth = false; // AI生成深度图状态
    this.layerVisibility = []; // 层级可见性状态数组
    
    this.init();
  }

  /**
   * 初始化应用
   */
  init() {
    this.loadApiToken();
    this.setupEventListeners();
    this.initializeDefaults();
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

    // AI生成深度图按钮
    const aiGenerateBtn = document.getElementById('aiGenerateBtn');
    if (aiGenerateBtn) {
      aiGenerateBtn.addEventListener('click', () => {
        this.generateDepthWithAI();
      });
    }

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

    // 边框滑块
    const borderSlider = document.getElementById('borderWidth');
    borderSlider.addEventListener('input', (e) => {
      this.updateBorderValue(e.target.value);
    });

    // 处理按钮
    document.getElementById('processBtn').addEventListener('click', () => {
      this.startProcessing();
    });

    // 3D预览控制
    const spacingSlider = document.getElementById('spacingSlider');
    if (spacingSlider) {
      spacingSlider.addEventListener('input', (e) => {
        this.updateSpacingValue(e.target.value);
      });
    }

    const resetCameraBtn = document.getElementById('resetCameraBtn');
    if (resetCameraBtn) {
      resetCameraBtn.addEventListener('click', () => {
        this.resetCamera();
      });
    }

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
   * AI生成深度图
   */
  async generateDepthWithAI() {
    if (!this.files.image) {
      this.showError('请先上传原始图片');
      return;
    }

    if (!this.apiToken || !this.depthGenerator) {
      this.showError('请先配置有效的Replicate API Token');
      return;
    }

    if (this.isGeneratingDepth) {
      return; // 防止重复点击
    }

    try {
      this.isGeneratingDepth = true;
      this.updateAIGenerateButton(true);

      console.log('🚀 开始AI生成深度图...');
      
      const depthImageUrl = await this.depthGenerator.generateDepthMap(
        this.files.image,
        (progress, message) => {
          console.log(`AI生成进度: ${progress}% - ${message}`);
        }
      );

      // 将生成的深度图设置为深度图文件
      const response = await fetch(depthImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'ai_generated_depth.png', { type: 'image/png' });
      
      this.files.depth = file;
      this.showImagePreview(file, 'depthPreview', 'depthPreviewImg', 'depthFileName');
      this.updateProcessButton();
      
      console.log('✅ AI深度图生成完成');
      
    } catch (error) {
      console.error('❌ AI深度图生成失败:', error);
      this.showError(`AI生成深度图失败: ${error.message}`);
    } finally {
      this.isGeneratingDepth = false;
      this.updateAIGenerateButton(false);
    }
  }

  /**
   * 更新AI生成按钮状态
   * @param {boolean} isLoading 是否正在加载
   */
  updateAIGenerateButton(isLoading) {
    const btn = document.getElementById('aiGenerateBtn');
    if (!btn) return;

    if (isLoading) {
      btn.classList.add('loading');
      btn.disabled = true;
      btn.querySelector('.btn-icon').textContent = '⏳';
      btn.querySelector('.btn-text').textContent = '生成中...';
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
      btn.querySelector('.btn-icon').textContent = '🤖';
      btn.querySelector('.btn-text').textContent = 'AI生成深度图';
    }
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
    
    // 更新预设按钮状态（如果存在的话）
    const presetBtns = document.querySelectorAll('.preset-btn');
    if (presetBtns.length > 0) {
      presetBtns.forEach(btn => {
        btn.classList.remove('active');
      });
      
      // 如果是预设值，高亮对应按钮
      const presetValues = { 4: 0, 8: 1, 16: 2, 32: 3 };
      if (presetValues[value] !== undefined && presetBtns[presetValues[value]]) {
        presetBtns[presetValues[value]].classList.add('active');
      }
    }
  }

  /**
   * 更新边框值显示
   * @param {string} value 边框值
   */
  updateBorderValue(value) {
    document.getElementById('borderValue').textContent = value;
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
    const aiGenerateBtn = document.getElementById('aiGenerateBtn');
    
    let canProcess = false;
    let statusText = '';

    // 手动模式逻辑
    canProcess = !!(this.files.image && this.files.depth);
    statusText = !this.files.image ?
      '请上传原始图片' :
      !this.files.depth ?
        '请上传深度图或使用AI生成' :
        '准备就绪，点击开始处理';

    processBtn.disabled = !canProcess;
    processStatus.textContent = statusText;

    // 更新AI生成按钮状态
    if (aiGenerateBtn) {
      const canGenerateAI = !!(this.files.image && this.apiToken && this.depthGenerator && !this.isGeneratingDepth);
      aiGenerateBtn.disabled = !canGenerateAI;
    }
  }

  /**
   * 开始处理
   */
  async startProcessing() {
    if (!this.validateInputs()) return;

    this.processingStartTime = Date.now();
    this.showProgress();
    
    try {
      // 固定使用手动模式处理
      await this.processManual();
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

    if (!this.files.depth) {
      this.showError('请上传深度图或使用AI生成深度图');
      return false;
    }

    return true;
  }


  /**
   * 手动模式处理
   */
  async processManual() {
    const layers = parseInt(document.getElementById('layerCount').value);
    const depthOverlap = parseInt(document.getElementById('depthOverlap').value);
    const borderWidth = parseInt(document.getElementById('borderWidth').value);
    
    // 准备图像
    this.updateProgress(20, 1, '准备图像...');
    
    // 处理层级切分
    this.updateProgress(40, 2, '开始层级切分...');
    
    this.depthCutter = new BrowserDepthCutter(layers, depthOverlap, borderWidth);
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

    // 初始化层级可见性状态（默认全部选中）
    this.layerVisibility = new Array(this.currentResults.length).fill(true);

    // 生成文件列表
    filesGrid.innerHTML = '';
    this.currentResults.forEach((result, index) => {
      const fileItem = this.createFileItem(result, index);
      filesGrid.appendChild(fileItem);
    });

    // 添加checkbox事件监听器
    this.setupLayerCheckboxListeners();

    // 显示结果区域
    resultsSection.style.display = 'block';
    resultsSection.classList.add('fade-in');
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    // 显示3D预览
    this.show3DPreview();
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
      <div class="file-checkbox-container">
        <input type="checkbox" id="layer-checkbox-${index}" class="layer-checkbox" checked data-layer-index="${index}">
      </div>
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
      downloadBtn.innerHTML = '<span class="btn-icon">📦</span>下载勾选文件';
    }
  }

  /**
   * 下载勾选的文件
   */
  async downloadSelectedFiles() {
    try {
      const downloadBtn = document.getElementById('downloadAllBtn');
      const originalText = downloadBtn.innerHTML;
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<span class="btn-icon">⏳</span>正在打包...';

      // 获取勾选的层级索引
      const selectedIndices = [];
      this.layerVisibility.forEach((isVisible, index) => {
        if (isVisible) {
          selectedIndices.push(index);
        }
      });

      if (selectedIndices.length === 0) {
        this.showError('请至少勾选一个文件');
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = originalText;
        return;
      }

      // 下载选中的文件
      await this.depthCutter.downloadSelectedAsZip(selectedIndices);

      downloadBtn.disabled = false;
      downloadBtn.innerHTML = originalText;
    } catch (error) {
      console.error('Selected download failed:', error);
      this.showError(`下载勾选文件失败: ${error.message}`);
      
      const downloadBtn = document.getElementById('downloadAllBtn');
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<span class="btn-icon">📦</span>下载勾选文件';
    }
  }

  /**
   * 重置表单
   */
  resetForm() {
    // 重置文件
    this.files = { image: null, depth: null };
    this.currentResults = null;
    this.layerVisibility = []; // 重置层级可见性状态
    
    // 重置UI
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('depthPreview').style.display = 'none';
    document.getElementById('imageFile').value = '';
    document.getElementById('depthFile').value = '';
    
    // 隐藏结果区域
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('preview3dSection').style.display = 'none';
    
    // 重置设置
    this.setLayers(16);
    document.getElementById('depthOverlap').value = 100;
    document.getElementById('borderWidth').value = 4;
    this.updateBorderValue(4);
    
    const spacingSlider = document.getElementById('spacingSlider');
    if (spacingSlider) {
      spacingSlider.value = 0.02;
      this.updateSpacingValue(0.02);
    }
    
    // 清理处理器
    if (this.depthCutter) {
      this.depthCutter.cleanup();
      this.depthCutter = null;
    }

    // 清理3D预览
    if (this.threeDPreview) {
      this.threeDPreview.destroy();
      this.threeDPreview = null;
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

  /**
   * 显示3D预览
   */
  async show3DPreview() {
    if (!this.currentResults || this.currentResults.length === 0) {
      console.warn('No results to show in 3D preview');
      return;
    }

    try {
      // 创建3D预览实例
      if (!this.threeDPreview) {
        this.threeDPreview = new ThreeDPreview('preview3dViewport');
      }

      // 显示3D预览区域
      const preview3dSection = document.getElementById('preview3dSection');
      preview3dSection.style.display = 'block';
      preview3dSection.classList.add('fade-in');

      // 初始化并显示结果（使用可见的结果）
      await this.threeDPreview.init();
      const visibleResults = this.getVisibleResults();
      await this.threeDPreview.showResults(visibleResults);

      // 隐藏加载提示
      const loadingElement = document.getElementById('preview3dLoading');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }

      console.log('3D preview displayed successfully');
    } catch (error) {
      console.error('Failed to show 3D preview:', error);
      this.showError(`3D预览加载失败: ${error.message}`);
    }
  }

  /**
   * 更新间距值
   * @param {string} value 间距值
   */
  updateSpacingValue(value) {
    const spacingValue = document.getElementById('spacingValue');
    if (spacingValue) {
      spacingValue.textContent = parseFloat(value).toFixed(2);
    }

    if (this.threeDPreview) {
      this.threeDPreview.updateSpacingRatio(parseFloat(value));
    }
  }

  /**
   * 初始化默认值
   */
  initializeDefaults() {
    // 设置默认层级16
    document.getElementById('layerCount').value = 16;
    this.updateLayerValue(16);
    
    // 设置默认冗余100
    document.getElementById('depthOverlap').value = 100;
    
    // 设置默认边框粗细4
    document.getElementById('borderWidth').value = 4;
    this.updateBorderValue(4);
    
    // 设置默认间距0.02
    const spacingSlider = document.getElementById('spacingSlider');
    if (spacingSlider) {
      spacingSlider.value = 0.02;
      this.updateSpacingValue(0.02);
    }
  }

  /**
   * 重置相机视角
   */
  resetCamera() {
    if (this.threeDPreview) {
      this.threeDPreview.resetCamera();
    }
  }

  /**
   * 设置层级checkbox事件监听器
   */
  setupLayerCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.layer-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const layerIndex = parseInt(e.target.dataset.layerIndex);
        this.handleLayerVisibilityChange(layerIndex, e.target.checked);
      });
    });
  }

  /**
   * 处理层级可见性变化
   * @param {number} layerIndex 层级索引
   * @param {boolean} isVisible 是否可见
   */
  handleLayerVisibilityChange(layerIndex, isVisible) {
    // 更新可见性状态
    this.layerVisibility[layerIndex] = isVisible;
    
    // 更新3D预览
    this.update3DPreview();
  }

  /**
   * 更新3D预览，只显示选中的层级
   */
  update3DPreview() {
    if (!this.threeDPreview || !this.currentResults) {
      return;
    }

    // 过滤出可见的结果
    const visibleResults = this.currentResults.filter((result, index) => {
      return this.layerVisibility[index];
    });

    // 更新3D预览，不重置摄像头
    this.threeDPreview.updateResults(visibleResults);
  }

  /**
   * 获取可见的层级结果
   * @returns {Array} 可见的层级结果数组
   */
  getVisibleResults() {
    if (!this.currentResults || !this.layerVisibility) {
      return this.currentResults || [];
    }
    
    return this.currentResults.filter((result, index) => {
      return this.layerVisibility[index];
    });
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

function downloadSelectedFiles() {
  app.downloadSelectedFiles();
}

// 初始化应用
const app = new DepthCutFrontendApp();

// 页面加载完成后的额外初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DepthCut Frontend Interface loaded');
});