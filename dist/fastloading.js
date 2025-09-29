var tpanoAutoLoad = [];

for (let i = 0; i < document.getElementsByTagName("tpano").length; i++) {
  const panoElement = document.getElementsByTagName("tpano")[i];

  // 获取地理参考信息
  const geoRef = {
    longitude: parseFloat(panoElement.getAttribute("data-lon")) || 118.931944,
    latitude: parseFloat(panoElement.getAttribute("data-lat")) || 32.028096,
    altitude: parseFloat(panoElement.getAttribute("data-alt")) || 10,
  };

  const pano = new TPano({
    el: panoElement.id,
    geoReference: geoRef, // 设置地理参考原点
    photo: [
      {
        url: panoElement.attributes.src.value,
        name: "main",
        geoReference: geoRef,
      },
    ],
    hotspot: [
      {
        source: "main",
        geoReference: {
          longitude: geoRef.longitude, // 东经增加0.01度
          latitude: geoRef.latitude, // 北纬增加0.01度
          altitude: geoRef.altitude + 1000, // 高度增加100米
        },
        imgUrl: "http://172.16.50.217:10081/image_api/simple.png",
        jumpTo: "next-pano",
      },
    ],
    rotateAnimateController: false,
    MouseController: false,
    debug: true,
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
