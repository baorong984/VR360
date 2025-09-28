var tpanoAutoLoad = Array();

for (let i = 0; i < document.getElementsByTagName("tpano").length; i++) {
  tpanoAutoLoad[i] = new TPano({
    el: document.getElementsByTagName("tpano")[i].id, //照片查看器根节点dom的id
    photo: [
      //全景照片数组，每项为一张照片
      {
        url: document.getElementsByTagName("tpano")[i].attributes.src.value,
        name: "auto",
        // 添加地理位置信息
        geoLocation: {
          center: { lat: 39.9042, lng: 116.4074 }, // 拍摄点经纬度
          bounds: {
            // 贴图覆盖的经纬度范围
            north: 39.91,
            south: 39.898,
            east: 116.415,
            west: 116.399,
          },
        },
      },
    ],
    rotateAnimateController: false, //镜头自转
    MouseController: false, //鼠标控制
    debug: true, //调试模式
    // 添加点击回调函数
    onClickGeoLocation: function (geoPoint) {
      console.log("点击位置的实际经纬度:", geoPoint);
      // 处理点击位置的实际经纬度
    },
  });
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
