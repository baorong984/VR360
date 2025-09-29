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
          longitude: 118.928506,
          latitude: 32.031822,
          altitude: 10,
        },
        imgUrl: "http://172.16.50.217:10081/image_api/simple.png",
        jumpTo: "A2",
      },
      {
        source: "main",
        geoReference: {
          longitude: 118.929427,
          latitude: 32.025522,
          altitude: 10,
        },
        imgUrl: "http://172.16.50.217:10081/image_api/source.png",
        jumpTo: "泉水新村",
      },
      // {
      //   source: "main",
      //   geoReference: {
      //     longitude: 118.922261,
      //     latitude: 32.027616,
      //     altitude: 10,
      //   },
      //   imgUrl: "http://172.16.50.217:10081/image_api/simple.png",
      //   jumpTo: "中专",
      // },
      {
        source: "main",
        geoReference: {
          longitude: 118.936728,
          latitude: 32.029724,
          altitude: 10,
        },
        imgUrl: "http://172.16.50.217:10081/image_api/source.png",
        jumpTo: "泉水公寓",
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
