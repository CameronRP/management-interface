window.onload = function() {
  trapUpdateLoop();
};

function trapUpdateLoop() {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", "/api/digital-pins", true)
  xmlHttp.setRequestHeader("Authorization", "Basic "+btoa("admin:feathers"))
  xmlHttp.onreadystatechange = async function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
      console.log(xmlHttp);
      updateDigitalPins(xmlHttp.responseText);
      await sleep(500);
      trapUpdateLoop()
    } else {
      console.log(xmlHttp);
    }
  }
  xmlHttp.send(null);
}

function updateDigitalPins(res) {
  var ele = document.getElementById("digital-pins");
  var digitalPins = JSON.parse(res);
  while (ele.firstChild) {
    ele.removeChild(ele.firstChild);
  }
  for (var i in digitalPins) {
    var pin = digitalPins[i];
    var div = document.createElement("div");
    div.innerText = "Pin: " + pin.Name + ", value: " + pin.Value
    ele.appendChild(div)
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
