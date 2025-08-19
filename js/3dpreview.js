/**
 * 3D Preview Module - 3D场景预览切分后的图片
 * 使用Three.js实现3D场景，显示按深度排列的图片层级
 */

class ThreeDPreview {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.meshes = [];
    this.spacingRatio = 0.50; // 间距/图片宽度比例
    this.isInitialized = false;
    
    // 绑定方法
    this.onWindowResize = this.onWindowResize.bind(this);
    this.animate = this.animate.bind(this);
  }

  /**
   * 初始化3D场景
   */
  async init() {
    if (this.isInitialized) return;

    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      throw new Error(`Container with id '${this.containerId}' not found`);
    }

    // 检查Three.js是否已加载
    if (typeof THREE === 'undefined') {
      await this.loadThreeJS();
    }

    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    this.setupLights();
    
    // 添加事件监听器
    window.addEventListener('resize', this.onWindowResize, false);
    
    this.isInitialized = true;
    this.animate();
    
    console.log('3D Preview initialized');
  }

  /**
   * 动态加载Three.js库
   */
  async loadThreeJS() {
    return new Promise((resolve, reject) => {
      // 加载Three.js核心库
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => {
        // 加载OrbitControls
        const controlsScript = document.createElement('script');
        controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
        controlsScript.onload = resolve;
        controlsScript.onerror = reject;
        document.head.appendChild(controlsScript);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * 设置场景
   */
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
  }

  /**
   * 设置相机
   */
  setupCamera() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 10);
  }

  /**
   * 设置渲染器
   */
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  /**
   * 设置控制器
   */
  setupControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.maxDistance = 50;
    this.controls.minDistance = 2;
  }

  /**
   * 设置光照
   */
  setupLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // 点光源
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-10, -10, -5);
    this.scene.add(pointLight);
  }

  /**
   * 显示切分结果
   * @param {Array} results 切分结果数组
   */
  async showResults(results) {
    if (!this.isInitialized) {
      await this.init();
    }

    // 清除之前的网格
    this.clearMeshes();

    if (!results || results.length === 0) {
      console.warn('No results to display');
      return;
    }

    // 计算布局参数
    const layerCount = results.length;
    const baseWidth = 4; // 基础宽度
    const baseHeight = 3; // 基础高度
    const spacing = baseWidth * this.spacingRatio;
    const totalDepth = (layerCount - 1) * spacing;
    const startZ = -totalDepth / 2; // 从后往前排列

    // 为每个结果创建平面
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const z = startZ + i * spacing; // Z轴位置，0号图在最下面（最远处）
      
      try {
        const mesh = await this.createImagePlane(result, baseWidth, baseHeight, z);
        this.meshes.push(mesh);
        this.scene.add(mesh);
      } catch (error) {
        console.error(`Failed to create plane for layer ${result.layer}:`, error);
      }
    }

    // 调整相机位置以适应所有图片
    this.adjustCameraView(totalDepth, baseHeight);
    
    console.log(`Displayed ${this.meshes.length} layers in 3D preview`);
  }

  /**
   * 创建图片平面
   * @param {Object} result 切分结果
   * @param {number} width 平面宽度
   * @param {number} height 平面高度
   * @param {number} z Z坐标
   * @returns {THREE.Mesh} 网格对象
   */
  async createImagePlane(result, width, height, z) {
    return new Promise((resolve, reject) => {
      // 创建纹理加载器
      const loader = new THREE.TextureLoader();
      
      // 加载纹理
      loader.load(
        result.dataUrl,
        (texture) => {
          // 创建几何体
          const geometry = new THREE.PlaneGeometry(width, height);
          
          // 创建材质
          const material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
          });
          
          // 创建网格
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(0, 0, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          // 添加用户数据
          mesh.userData = {
            layer: result.layer,
            depthRange: result.depthRange,
            filename: result.filename
          };
          
          resolve(mesh);
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 调整相机视角
   * @param {number} totalDepth 总深度
   * @param {number} height 高度
   */
  adjustCameraView(totalDepth, height) {
    const distance = Math.max(totalDepth * 1.2, height * 2, 12);
    // 设置相机位置，从侧面观看层叠效果
    this.camera.position.set(distance * 0.8, distance * 0.4, distance * 0.6);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * 更新间距比例
   * @param {number} ratio 间距比例
   */
  updateSpacingRatio(ratio) {
    this.spacingRatio = Math.max(0.01, Math.min(1.00, ratio));
    
    if (this.meshes.length > 0) {
      // 重新计算位置
      const baseWidth = 4;
      const spacing = baseWidth * this.spacingRatio;
      const totalDepth = (this.meshes.length - 1) * spacing;
      const startZ = -totalDepth / 2;
      
      // 更新每个网格的位置
      this.meshes.forEach((mesh, index) => {
        const z = startZ + index * spacing;
        mesh.position.z = z;
      });
      
      // 调整相机视角
      this.adjustCameraView(totalDepth, 3);
    }
  }

  /**
   * 清除所有网格
   */
  clearMeshes() {
    this.meshes.forEach(mesh => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
      }
    });
    this.meshes = [];
  }

  /**
   * 窗口大小改变处理
   */
  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * 动画循环
   */
  animate() {
    if (!this.isInitialized) return;
    
    requestAnimationFrame(this.animate);
    
    if (this.controls) {
      this.controls.update();
    }
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * 显示/隐藏预览
   * @param {boolean} visible 是否显示
   */
  setVisible(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * 销毁3D预览
   */
  destroy() {
    // 移除事件监听器
    window.removeEventListener('resize', this.onWindowResize);
    
    // 清除网格
    this.clearMeshes();
    
    // 清理Three.js对象
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
    
    if (this.controls) {
      this.controls.dispose();
    }
    
    // 重置状态
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.meshes = [];
    this.isInitialized = false;
    
    console.log('3D Preview destroyed');
  }

  /**
   * 获取当前间距比例
   * @returns {number} 间距比例
   */
  getSpacingRatio() {
    return this.spacingRatio;
  }

  /**
   * 重置相机位置
   */
  resetCamera() {
    if (this.meshes.length > 0) {
      const baseWidth = 4;
      const spacing = baseWidth * this.spacingRatio;
      const totalDepth = (this.meshes.length - 1) * spacing;
      this.adjustCameraView(totalDepth, 3);
    } else {
      this.camera.position.set(8, 3, 6);
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThreeDPreview;
} else {
  window.ThreeDPreview = ThreeDPreview;
}