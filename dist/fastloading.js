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
          altitude: 10,
        },
      },
    ],
    hotspot: [
      {
        source: "main",
        targetLon: 230.59090964594947, // 使用绝对经度（比拍摄点经度大0.01）
        targetLat: 8.511624070050303, // 使用绝对纬度（比拍摄点纬度大0.01）
        altitude: 0,
        imgUrl: "http://172.16.50.217:10081/image_api/simple.png",
        jumpTo: "next-pano",
      },
    ],
    rotateAnimateController: false, //镜头自转
    MouseController: false, //鼠标控制
    debug: true, //调试模式
  });
  tpanoAutoLoad[i] = pano;

  setTimeout(() => {}, 500);
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
