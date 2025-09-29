function TPano(d) {
  //选取渲染对象的根dom
  let el = document.getElementById(d.el);
  var width = el.clientWidth;
  var height = el.clientHeight;

  //参数处理
  if (d.DeviceOrientationControls == null) {
    d.DeviceOrientationControls = false;
  }
  if (d.MouseController == null) {
    d.MouseController = true;
  }

  //初始化场景、相机、渲染器
  const scene = new THREE.Scene();
  let fov;
  if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
    //手机端视角
    fov = 90;
  } else {
    //pc端视角
    fov = 60;
  }
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    // 添加以下设置
    depth: true,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  renderer.setSize(width, height);
  renderer.setClearColor(0x272727, 1.0);
  renderer.setPixelRatio(window.devicePixelRatio);
  el.append(renderer.domElement);

  //地理坐标原点（全景拍摄点）
  let geoOrigin = {
    longitude: d.geoReference?.longitude || 0,
    latitude: d.geoReference?.latitude || 0,
    altitude: d.geoReference?.altitude || 0,
  };

  /**
   * 将地理坐标(经纬度,高度)转换为三维坐标(x,y,z)
   */
  function geoTo3D(
    longitude,
    latitude,
    altitude,
    originLon,
    originLat,
    originAlt
  ) {
    const R = 6371000; // 地球半径(米)

    // 将经纬度转换为弧度
    const lonRad = THREE.MathUtils.degToRad(longitude);
    const latRad = THREE.MathUtils.degToRad(latitude);
    const originLonRad = THREE.MathUtils.degToRad(originLon);
    const originLatRad = THREE.MathUtils.degToRad(originLat);

    // 计算相对于原点的偏移量
    const deltaLon = lonRad - originLonRad;
    const deltaLat = latRad - originLatRad;

    // 使用平面近似（适用于小范围）
    // 经度方向：x轴正方向（东）
    // 纬度方向：z轴正方向（北）
    // 高度方向：y轴正方向（上）
    const x = deltaLon * R * Math.cos(originLatRad);
    const z = deltaLat * R;
    const y = altitude - originAlt;

    return new THREE.Vector3(x, y, z);
  }

  //生成全景图片3D对象
  const geometry = new THREE.SphereBufferGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);
  let mesh = new THREE.Mesh(geometry);
  scene.add(mesh);
  var texture = Array();
  let loadTextureLoaderCount = 0;
  loadTextureLoader(loadTextureLoaderCount);

  function loadTextureLoader(i) {
    if (d.photo[i].type == "VIDEO") {
      el.insertAdjacentHTML(
        "beforeend",
        '<video id="video-' +
          i +
          '" loop muted style="display: none;" crossOrigin="anonymous" playsinline ><source src="' +
          d.photo[i].url +
          '"></video>'
      );
      let videoId = "video-" + i;
      let videoDom = document.getElementById(videoId);
      videoDom.play();
      texture[i] = new THREE.VideoTexture(videoDom);
      setTimeout(() => {
        loadTextureLoaderEnd();
      }, 2000);
    } else {
      texture[i] = new THREE.TextureLoader().load(
        d.photo[i].url,
        function () {
          loadTextureLoaderEnd();
        },
        function (e) {
          console.log(e);
        },
        function (err) {
          console.error("An error happened.");
        }
      );
    }
  }

  var loadTextureMsg;
  function loadTextureLoaderEnd() {
    let i = loadTextureLoaderCount;
    console.log(texture);
    texture[i].panoName = d.photo[i].name;
    loadTextureMsg = {
      all: d.photo.length,
      loading: {
        id: i + 1,
        name: d.photo[i].name,
      },
      Leftover: d.photo.length - i - 1,
    };
    if (d.photoLoad != null) {
      d.photoLoad(loadTextureMsg);
    }
    if (loadTextureLoaderCount == 0) {
      switchPhotoN(0);
    }
    if (loadTextureLoaderCount < d.photo.length - 1) {
      loadTextureLoader(++loadTextureLoaderCount);
    }
  }

  function switchPhotoN(i) {
    let response = {
      status: "ERROR",
      msg: "系统出错",
    };

    if (i < d.photo.length && i >= 0) {
      if (loadTextureMsg.all - loadTextureMsg.Leftover >= i + 1) {
        if (d.switchLoad != null) {
          d.switchLoad({
            loading: {
              id: i + 1,
              name: d.photo[i].name,
            },
            status: "end",
          });
        }
        switchGo();
      } else {
        if (d.switchLoad != null) {
          d.switchLoad({
            loading: {
              id: i + 1,
              name: d.photo[i].name,
            },
            status: "loading",
          });
        }
        setTimeout(switchPhotoN, 1000, i);
      }

      function switchGo() {
        let fov;
        if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
          try {
            fov = d.photo[i].fov.phone;
          } catch (error) {
            fov = null;
          }
        } else {
          try {
            fov = d.photo[i].fov.pc;
          } catch (error) {
            fov = null;
          }
        }
        if (fov != null) {
          camera.fov = fov;
          camera.updateProjectionMatrix();
        } else {
          if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
            fov = 90;
          } else {
            fov = 60;
          }
          camera.fov = fov;
          camera.updateProjectionMatrix();
        }
        console.log(texture);
        material = new THREE.MeshBasicMaterial({ map: texture[i] });
        mesh.material = material;
        cleanHotspot();
        if (d.hotspot != null) {
          initHotspot();
        }
        response = {
          status: "OK",
          msg: "切换成功",
        };
      }
    } else {
      response.msg = "无效的照片索引";
    }

    return response;
  }

  //生成热点
  let hotspotAnimate_count = 1;
  let hotspotAnimate_temp = Array();
  function initHotspot() {
    for (let j = 0; j < d.hotspot.length; j++) {
      if (mesh.material.map.panoName == d.hotspot[j].source) {
        let map = new THREE.TextureLoader().load(d.hotspot[j].imgUrl);

        // 改进的材质设置，防止热点被遮住
        let material = new THREE.SpriteMaterial({
          map: map,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          alphaTest: 0.1,
        });

        let sprite = new THREE.Sprite(material);

        // 处理地理坐标热点
        if (d.hotspot[j].geoReference) {
          const geoPos = d.hotspot[j].geoReference;
          const threeDPos = geoTo3D(
            geoPos.longitude,
            geoPos.latitude,
            geoPos.altitude,
            geoOrigin.longitude,
            geoOrigin.latitude,
            geoOrigin.altitude
          );

          // 将三维坐标投影到球面上（半径为501的球体，稍微向外偏移）
          const direction = threeDPos.normalize();
          const spherePos = direction.multiplyScalar(501);

          sprite.position.copy(spherePos);
        }
        // 处理传统的三维坐标热点（向后兼容）
        else if (d.hotspot[j].position) {
          const position = d.hotspot[j].position;
          const direction = new THREE.Vector3(
            position.x,
            position.y,
            position.z
          ).normalize();

          // 沿着方向向量稍微向外偏移
          sprite.position.set(
            position.x * 0.91,
            position.y * 0.91,
            position.z * 0.91
          );
        }

        sprite.scale.set(30, 30, 1);
        sprite.renderOrder = 999; // 设置较高的渲染顺序
        sprite.name = "hotspot";

        for (let k = 0; k < d.photo.length; k++) {
          if (d.photo[k].name == d.hotspot[j].jumpTo) {
            sprite.jumpTo = k;
          }
        }
        scene.add(sprite);
      }
    }

    for (let i = 0; i < scene.children.length; i++) {
      if (scene.children[i].name == "hotspot") {
        hotspotAnimate_temp[i] = scene.children[i].position.y;
      }
    }
  }

  //清除热点
  function cleanHotspot() {
    let children = scene.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i].name == "hotspot") {
        scene.children.splice(i, 1);
        i--;
      }
    }
  }

  //体感控制
  let devicecontrol;
  try {
    devicecontrol = new THREE.DeviceOrientationControls(camera);
  } catch (error) {
    devicecontrol = null;
  }

  //启动鼠标控制
  mouseController();
  //启动多点触控
  phoneController();

  //动画绑定
  function animate() {
    requestAnimationFrame(animate);

    //热点摆动
    for (let i = 0; i < scene.children.length; i++) {
      if (scene.children[i].name == "hotspot") {
        if (hotspotAnimate_count >= 400) {
          hotspotAnimate_count = 1;
          scene.children[i].position.y = hotspotAnimate_temp[i];
        }

        if (hotspotAnimate_count <= 200) {
          scene.children[i].position.y = scene.children[i].position.y + 0.04;
        } else {
          scene.children[i].position.y = scene.children[i].position.y - 0.04;
        }

        hotspotAnimate_count++;
      }
    }

    render();
  }
  animate();

  //镜头自由旋转
  let anglexoz = -90;
  var rotateAnimateController = d.rotateAnimateController;
  function rotateAnimate() {
    if (
      rotateAnimateController == true &&
      d.DeviceOrientationControls == false
    ) {
      anglexoz += 0.1;
      if (anglexoz > 360) {
        anglexoz = 0;
      }
      let x = Math.cos((anglexoz * Math.PI) / 180) * 500;
      let z = Math.sin((anglexoz * Math.PI) / 180) * 500;
      camera.lookAt(x, 0, z);
    }
  }
  setInterval(rotateAnimate, 1000 / 60);

  el.addEventListener("pointerdown", function () {
    if (d.MouseController) {
      rotateAnimateController = false;
    }
  });

  //手机端多点触控
  let mouseFovControllerSport = true;
  function phoneController() {
    let oldL = 0;
    let x1, x2, y1, y2, l;
    document.addEventListener(
      "touchstart",
      function (event) {
        if (!d.MouseController) {
          return;
        }
        if (event.touches.length == 2) {
          mouseFovControllerSport = false;
          x1 = event.touches[0].clientX;
          x2 = event.touches[1].clientX;
          y1 = event.touches[0].clientY;
          y2 = event.touches[1].clientY;
          oldL = Math.sqrt(
            Math.pow(Math.abs(x2 - x1), 2) + Math.pow(Math.abs(y2 - y1), 2)
          );
        } else {
          mouseFovControllerSport = true;
        }
      },
      false
    );
    document.addEventListener(
      "touchmove",
      function (event) {
        if (!d.MouseController) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (event.touches.length == 2) {
          x1 = event.touches[0].clientX;
          x2 = event.touches[1].clientX;
          y1 = event.touches[0].clientY;
          y2 = event.touches[1].clientY;

          l = Math.sqrt(
            Math.pow(Math.abs(x2 - x1), 2) + Math.pow(Math.abs(y2 - y1), 2)
          );

          let lAdd = l - oldL;
          oldL = l;

          console.log(lAdd);
          const fov = camera.fov - lAdd * 0.3;
          camera.fov = THREE.MathUtils.clamp(fov, 10, 90);
          camera.updateProjectionMatrix();
        }
      },
      false
    );
  }

  //封装鼠标控制
  function mouseController() {
    let isUserInteracting = false,
      onPointerDownMouseX = 0,
      onPointerDownMouseY = 0,
      lon = -90,
      onPointerDownLon = 0,
      lat = 0,
      onPointerDownLat = 0,
      phi = 0,
      theta = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onMouseMove(event) {
      if (!d.MouseController) {
        return;
      }
      mouse.x = (event.clientX / el.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / el.clientHeight) * 2 + 1;
      render();
    }

    let clientX, clientY;
    el.addEventListener("pointerdown", function (event) {
      if (!d.MouseController) {
        return;
      }
      clientX = event.clientX;
      clientY = event.clientY;
    });
    el.addEventListener("pointerup", function (event) {
      if (!d.MouseController) {
        return;
      }
      var distance = Math.sqrt(
        Math.pow(Math.abs(event.clientX - clientX), 2) +
          Math.pow(Math.abs(event.clientY - clientY), 2)
      );
      if (distance <= 10) {
        positionClick();
      }
    });

    function positionClick() {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      for (let i = 0; i < intersects.length; i++) {
        if (d.debug == true) {
          console.log("点击坐标：", intersects[i].point);
        }
        if (intersects[i].object.jumpTo != null && i == 0) {
          switchPhotoN(intersects[i].object.jumpTo);
          console.log(scene);
        }
      }
    }

    el.style.touchAction = "none";
    el.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("wheel", onDocumentMouseWheel);

    lon = -1 * THREE.MathUtils.radToDeg(camera.rotation.y) - 90;
    lat = THREE.MathUtils.radToDeg(camera.rotation.x);

    function onPointerDown(event) {
      if (!d.MouseController) {
        return;
      }

      onMouseMove(event);
      if (event.isPrimary === false) return;
      isUserInteracting = true;

      onPointerDownMouseX = event.clientX;
      onPointerDownMouseY = event.clientY;

      onPointerDownLon = lon;
      onPointerDownLat = lat;

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    }

    function onPointerMove(event) {
      if (!d.MouseController) {
        return;
      }
      if (event.isPrimary === false) return;
      let rate;
      if (el.clientWidth <= 700 || el.clientWidth < el.clientHeight) {
        rate = 0.4;
      } else {
        rate = 0.1;
      }

      if (mouseFovControllerSport) {
        lon = (onPointerDownMouseX - event.clientX) * rate + onPointerDownLon;
        lat = (event.clientY - onPointerDownMouseY) * rate + onPointerDownLat;
        update();
      }
    }

    function onPointerUp() {
      if (!d.MouseController) {
        return;
      }
      if (event.isPrimary === false) return;
      isUserInteracting = false;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    }

    function onDocumentMouseWheel(event) {
      if (!d.MouseController) {
        return;
      }
      const fov = camera.fov + event.deltaY * 0.05;
      camera.fov = THREE.MathUtils.clamp(fov, 10, 75);
      camera.updateProjectionMatrix();
    }

    function update() {
      if (isUserInteracting === false) {
      }
      lat = Math.max(-85, Math.min(85, lat));
      phi = THREE.MathUtils.degToRad(90 - lat);
      theta = THREE.MathUtils.degToRad(lon);
      const x = 500 * Math.sin(phi) * Math.cos(theta);
      const y = 500 * Math.cos(phi);
      const z = 500 * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(x, y, z);
    }
  }

  //渲染
  function render() {
    if (d.DeviceOrientationControls == true) {
      if (
        camera.rotation._x == -1.5707963267948966 &&
        camera.rotation._y == 0 &&
        camera.rotation._z == 0
      ) {
        d.gyroSport(false);
      } else {
        d.gyroSport(true);
      }
      devicecontrol.update();
    }
    renderer.render(scene, camera);
  }

  //创建外部访问接口函数
  this.re = {
    /**
     * 宽高重设
     */
    resizeRendererToDisplaySize: function resizeRendererToDisplaySize(
      width,
      height
    ) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      el.style.width = width + "px";
      el.style.height = height + "px";
      renderer.domElement.style.width = width + "px";
      renderer.domElement.style.height = height + "px";
    },

    /**
     * 全景照片切换函数
     */
    switchPhoto: function switchPhoto(i) {
      return switchPhotoN(i - 1);
    },

    /**
     * 切换体感
     */
    switchGyro: function switchGyro(e) {
      d.DeviceOrientationControls = e;
    },

    /**
     * 切换鼠标控制
     */
    seitchMouseController: function seitchMouseController(e) {
      d.MouseController = e;
    },

    /**
     * 地理坐标转三维坐标
     */
    geoTo3D: function (longitude, latitude, altitude) {
      return geoTo3D(
        longitude,
        latitude,
        altitude,
        geoOrigin.longitude,
        geoOrigin.latitude,
        geoOrigin.altitude
      );
    },

    /**
     * 三维坐标转地理坐标
     */
    threeDToGeo: function (x, y, z) {
      const R = 6371000;
      const originLonRad = THREE.MathUtils.degToRad(geoOrigin.longitude);
      const originLatRad = THREE.MathUtils.degToRad(geoOrigin.latitude);

      const deltaLon = x / (R * Math.cos(originLatRad));
      const deltaLat = z / R;

      const longitude =
        geoOrigin.longitude + THREE.MathUtils.radToDeg(deltaLon);
      const latitude = geoOrigin.latitude + THREE.MathUtils.radToDeg(deltaLat);
      const altitude = geoOrigin.altitude + y;

      return { longitude, latitude, altitude };
    },
  };
}
