var tpanoAutoLoad = Array();

for (let i = 0; i < document.getElementsByTagName("tpano").length; i++) {
  const pano = new TPano({
    el: document.getElementsByTagName("tpano")[i].id, //照片查看器根节点dom的id
    photo: [
      //全景照片数组，每项为一张照片
      {
        url: document.getElementsByTagName("tpano")[i].attributes.src.value,
        name: "main",
        geoReference: {
          longitude: 118.931944,
          latitude: 32.028096,
          altitude: 10, // 添加高度信息（米），假设热点比拍摄点高10米
        },
      },
    ],
    hotspot: [
      {
        source: "main",
        targetLon: 118.931944, // 使用绝对经度（比拍摄点经度大0.01）
        targetLat: 32.028096, // 使用绝对纬度（比拍摄点纬度大0.01）
        altitude: 1,
        imgUrl: "http://172.16.50.217:10081/image_api/simple.png",
        jumpTo: "next-pano",
      },
    ],
    rotateAnimateController: false, //镜头自转
    MouseController: false, //鼠标控制
    debug: true, //调试模式
  });
  tpanoAutoLoad[i] = pano;

  setTimeout(() => {
    // 测试坐标转换
    const mapper = pano.api.getCoordinateMapper();
    const testLon = 118.931944 + 0.01;
    const testLat = 32.028096 + 0.01;

    const position = mapper.absoluteLonLatToVector3(testLon, testLat, 50);
    console.warn("热点坐标转换测试:", {
      输入经纬度: { lon: testLon, lat: testLat },
      输出位置: position,
      距离拍摄点: {
        经度差: testLon - 118.931944,
        纬度差: testLat - 32.028096,
      },
    });

    // 计算真实距离
    const distance = mapper.calculateDistance(
      118.931944,
      32.028096,
      testLon,
      testLat
    );
    console.warn("实际地理距离:", distance.toFixed(2) + "米");
  }, 500);
}

var el = window.document.body;
window.document.body.onmouseover = function (event) {
  el = event.target;
  if (el.tagName == "CANVAS") {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    console.log(tpanoAutoLoad);
    for (let i = 0; i < tpanoAutoLoad.length; i++) {
      tpanoAutoLoad[i].re.seitchMouseController(true);
    }
  } else {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";

    for (let i = 0; i < tpanoAutoLoad.length; i++) {
      tpanoAutoLoad[i].re.seitchMouseController(false);
    }
  }
};

window.document.body.addEventListener("touchstart", function (event) {
  el = event.target;
  console.log(el);
  if (el.tagName == "CANVAS") {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    console.log(tpanoAutoLoad);
    for (let i = 0; i < tpanoAutoLoad.length; i++) {
      tpanoAutoLoad[i].re.seitchMouseController(true);
    }
  } else {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";

    for (let i = 0; i < tpanoAutoLoad.length; i++) {
      tpanoAutoLoad[i].re.seitchMouseController(false);
    }
  }
});
