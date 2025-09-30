const photo_list = [
  {
    url: "http://172.16.50.217:10081/image_api/DJI_20250923161259_0005_V.jpg",
    name: "main",
    img_id: 1,
    geoReference: {
      longitude: 118.930907,
      latitude: 32.028434,
      altitude: 10,
    },
  },
  {
    url: "http://172.16.50.217:10081/image_api/DJI_20250923161046_0003_V.jpg",
    name: "0003",
    img_id: 3,
    geoReference: {
      longitude: 118.931944,
      latitude: 32.028096,
      altitude: 10,
    },
  },
];

const pano = new TPano({
  el: "tp",
  photo: photo_list,
  hotspot: [
    {
      source: "main",
      geoReference: {
        longitude: 118.931944,
        latitude: 32.028096,
        altitude: 10,
      },
      imgUrl: "http://172.16.50.217:10081/image_api/icon1.png",
      jumpTo: true,
      details: {
        title: "10kV1057精汽线032-015号杆养殖小区1分支线#002",
        img_id: 3,
        content: "002",
      },
    },
    {
      source: "main",
      geoReference: {
        longitude: 118.930907,
        latitude: 32.028434,
        altitude: 10,
      },
      imgUrl: "http://172.16.50.217:10081/image_api/icon1.png",
      jumpTo: true,
      details: {
        title: "10kV1057精汽线032-015号杆养殖小区1分支线#004",
        img_id: 1,
        content: "004",
      },
    },
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
    {
      source: "main",
      geoReference: {
        longitude: 118.922261,
        latitude: 32.027616,
        altitude: 10,
      },
      imgUrl: "http://172.16.50.217:10081/image_api/simple.png",
      jumpTo: "中专",
    },
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
  onHotspotClick: function (hotspot) {
    console.warn("点击了热点：", pano, hotspot);
    const img_id = hotspot.img_id;
    let index = photo_list.findIndex((item) => item.img_id == img_id);

    // 点击热点后，切换到对应的全景照片
    pano.re.switchPhoto(index);
  },
});

var el = window.document.body;
window.document.body.onmouseover = function (event) {
  el = event.target;
  if (el.tagName == "CANVAS") {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    pano.re.seitchMouseController(true);
  } else {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";

    pano.re.seitchMouseController(false);
  }
};

window.document.body.addEventListener("touchstart", function (event) {
  el = event.target;
  console.log(el);
  if (el.tagName == "CANVAS") {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    pano.re.seitchMouseController(true);
  } else {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";

    pano.re.seitchMouseController(false);
  }
});
