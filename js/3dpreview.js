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
    this.spacingRatio = 0.025; // 间距/图片宽度比例
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
   * 设置光照 - 已禁用，使用无光照材质
   */
  setupLights() {
    // 不再添加光照，使用无光照材质显示原始色彩
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
    const baseScale = 4; // 基础缩放比例
    const spacing = baseScale * this.spacingRatio;
    const totalDepth = (layerCount - 1) * spacing;
    const startZ = -totalDepth / 2; // 从后往前排列

    // 为每个结果创建平面
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const z = startZ + i * spacing; // Z轴位置，0号图在最下面（最远处）
      
      try {
        const mesh = await this.createImagePlane(result, baseScale, z);
        this.meshes.push(mesh);
        this.scene.add(mesh);
      } catch (error) {
        console.error(`Failed to create plane for layer ${result.layer}:`, error);
      }
    }

    // 调整相机位置以适应所有图片
    this.adjustCameraView(totalDepth, baseScale);
    
    console.log(`Displayed ${this.meshes.length} layers in 3D preview`);
  }

  /**
   * 更新显示结果，不重置摄像头位置
   * @param {Array} results 切分结果数组
   */
  async updateResults(results) {
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
    const baseScale = 4; // 基础缩放比例
    const spacing = baseScale * this.spacingRatio;
    const totalDepth = (layerCount - 1) * spacing;
    const startZ = -totalDepth / 2; // 从后往前排列

    // 为每个结果创建平面
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const z = startZ + i * spacing; // Z轴位置，0号图在最下面（最远处）
      
      try {
        const mesh = await this.createImagePlane(result, baseScale, z);
        this.meshes.push(mesh);
        this.scene.add(mesh);
      } catch (error) {
        console.error(`Failed to create plane for layer ${result.layer}:`, error);
      }
    }

    // 不调整摄像头位置，保持当前视角
    console.log(`Updated ${this.meshes.length} layers in 3D preview without camera reset`);
  }

  /**
   * 创建图片平面
   * @param {Object} result 切分结果
   * @param {number} scale 缩放比例
   * @param {number} z Z坐标
   * @returns {THREE.Mesh} 网格对象
   */
  async createImagePlane(result, scale, z) {
    return new Promise((resolve, reject) => {
      // 创建纹理加载器
      const loader = new THREE.TextureLoader();
      
      // 加载纹理
      loader.load(
        result.dataUrl,
        (texture) => {
          // 设置纹理过滤方式，避免模糊和描边
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.wrapS = THREE.ClampToEdgeWrap;
          texture.wrapT = THREE.ClampToEdgeWrap;
          texture.generateMipmaps = false;
          
          // 获取原始图片尺寸
          const img = texture.image;
          const aspectRatio = img.width / img.height;
          
          // 根据原始宽高比计算平面尺寸
          let width, height;
          if (aspectRatio >= 1) {
            // 横图：以宽度为基准
            width = scale;
            height = scale / aspectRatio;
          } else {
            // 竖图：以高度为基准
            height = scale;
            width = scale * aspectRatio;
          }
          
          // 创建几何体
          const geometry = new THREE.PlaneGeometry(width, height);
          
          // 创建无光照材质，显示原始色彩，优化透明度处理
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.01, // 设置alpha测试阈值，避免透明像素的描边效果
            depthWrite: false // 禁用深度写入，避免层级间的视觉干扰
          });
          
          // 创建网格
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(0, 0, z);
          
          // 添加用户数据
          mesh.userData = {
            layer: result.layer,
            depthRange: result.depthRange,
            filename: result.filename,
            originalSize: { width: img.width, height: img.height },
            aspectRatio: aspectRatio
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
   * @param {number} scale 缩放比例
   */
  adjustCameraView(totalDepth, scale) {
    const distance = Math.max(totalDepth * 1.2, scale * 2, 12);
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
    this.spacingRatio = Math.max(0.005, Math.min(0.05, ratio));
    
    if (this.meshes.length > 0) {
      // 重新计算位置
      const baseScale = 4;
      const spacing = baseScale * this.spacingRatio;
      const totalDepth = (this.meshes.length - 1) * spacing;
      const startZ = -totalDepth / 2;
      
      // 更新每个网格的位置
      this.meshes.forEach((mesh, index) => {
        const z = startZ + index * spacing;
        mesh.position.z = z;
      });
      
      // 不重置相机视角，保持用户当前的观察角度
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
      const baseScale = 4;
      const spacing = baseScale * this.spacingRatio;
      const totalDepth = (this.meshes.length - 1) * spacing;
      this.adjustCameraView(totalDepth, baseScale);
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