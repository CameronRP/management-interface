window.onload = function() {
  trapUpdateLoop();
};

trapUpdateLoop = async function() {
  var digitalPinRequest = new XMLHttpRequest();
  digitalPinRequest.open("GET", "/api/digital-pins", true)
  digitalPinRequest.setRequestHeader("Authorization", "Basic "+btoa("admin:feathers"))
  digitalPinRequest.onreadystatechange = async function() {
    if (digitalPinRequest.readyState == 4 && digitalPinRequest.status == 200) {
      updateDigitalPins(digitalPinRequest.responseText);
    }
  }
  digitalPinRequest.send(null);

  var actuatorsRequest = new XMLHttpRequest();
  actuatorsRequest.open("GET", "/api/actuators", true)
  actuatorsRequest.setRequestHeader("Authorization", "Basic "+btoa("admin:feathers"))
  actuatorsRequest.onreadystatechange = async function() {
    if (actuatorsRequest.readyState == 4 && actuatorsRequest.status == 200) {
      updateActuators(actuatorsRequest.responseText);
    }
  }
  actuatorsRequest.send(null);

  var servosRequest = new XMLHttpRequest();
  servosRequest.open("GET", "/api/servos", true)
  servosRequest.setRequestHeader("Authorization", "Basic "+btoa("admin:feathers"))
  servosRequest.onreadystatechange = async function() {
    if (servosRequest.readyState == 4 && servosRequest.status == 200) {
      updateServos(servosRequest.responseText);
    }
  }
  servosRequest.send(null);


  await sleep(1000);
  trapUpdateLoop()
}

function updateDigitalPins(res) {
  var ele = document.getElementById("digital-pins");
  var digitalPins = JSON.parse(res);

  for (var i in digitalPins) {
    var pin = digitalPins[i];

    // init pin if not found
    if (document.getElementById("digital-pin-"+pin.Name) == null) {
      console.log("init pin: " + pin.Name);
      var div = document.createElement("div");
      div.id = "digital-pin-"+pin.Name;
      div.className = "form-inline"
      var label = document.createElement("label");
      label.innerText = pin.Name + ", value: ";
      div.appendChild(label)
      var value = document.createElement("label");
      value.id = "digital-pin-value-"+pin.Name
      div.appendChild(value);
      if (pin.Output) {
        var i = document.createElement("i")
        i.id = "digital-pin-output-"+pin.Name;
        i.onclick = updateValueFunction("/api/digital-pins", pin.Name, newVal)
        i.style.fontSize = "30px";
        div.appendChild(i)
      }
      ele.appendChild(div)
    }

    // update if needed
    var value = document.getElementById("digital-pin-value-"+pin.Name);
    if (value.innerText != pin.Value.toString()) {
      console.log("update pin: "+ pin.Name);
      value.innerText = pin.Value.toString();
      if (pin.Output) {
        var output = document.getElementById("digital-pin-output-"+pin.Name);
        output.className = pin.Value == 1 ? "fas fa-toggle-off" : "fas fa-toggle-on";
        var newVal = pin.Value == 1 ? 0 : 1;
        output.onclick = updateValueFunction("/api/digital-pins", pin.Name, newVal)
      }
    }
  }
}

function updateActuators(res) {
  var ele = document.getElementById("actuators");
  var actuators = JSON.parse(res);

  for (var i in actuators) {
    var a = actuators[i];

    if (document.getElementById("actuator-"+a.Name) == null) {
      console.log("init actuator: " + a.Name);
      var div = document.createElement("div");
      div.id = "actuator-"+a.Name;
      div.className = "form-inline";
      var label = document.createElement("label");
      label.innerText = a.Name + ", value: "
      div.appendChild(label);

      var value = document.createElement("label");
      value.id = "actuator-value-" + a.Name;
      div.appendChild(value);

      var back = document.createElement("i");
      back.id = "actuator-back-"+a.Name;
      back.className = "fas fa-angle-double-left";
      back.style.fontSize = "30px";
      back.onclick = updateValueFunction("/api/actuators", a.Name, 2);
      div.appendChild(back);

      var stop = document.createElement("i");
      stop.id = "actuator-stop-" + a.Name;
      stop.className = "fas fa-pause";
      stop.style.fontSize = "30px";
      stop.onclick = updateValueFunction("/api/actuators", a.Name, 0);
      div.appendChild(stop);

      var forward = document.createElement("i");
      forward.id = "actuator-forward-" + a.Name;
      forward.className = "fas fa-angle-double-right";
      forward.style.fontSize = "30px";
      forward.onclick = updateValueFunction("/api/actuators", a.Name, 1);
      div.appendChild(forward);

      ele.appendChild(div);
    }

    var value = document.getElementById("actuator-value-"+a.Name);
    if (value.innerText != a.Value.toString()) {
      console.log("updating actuator: "+a.Name);
      value.innerText = a.Value.toString();

      var back = document.getElementById("actuator-back-"+a.Name);
      if ((a.Value == 2) != back.classList.contains("fa-disabled")) {
        back.classList.toggle("fa-disabled");
      }

      var stop = document.getElementById("actuator-stop-"+a.Name);
      if ((a.Value == 0) != stop.classList.contains("fa-disabled")) {
        stop.classList.toggle("fa-disabled");
      }

      var forward = document.getElementById("actuator-forward-"+a.Name);
      if ((a.Value == 1) != forward.classList.contains("fa-disabled")) {
        forward.classList.toggle("fa-disabled");
      }
    }
  }
}

function updateServos(res) {
  var ele = document.getElementById("servos");
  var servos = JSON.parse(res);

  for (var i in servos) {
    var s = servos[i];

    if (document.getElementById("servo-"+s.Name) == null) {
      console.log("init servo: " + s.Name);
      var div = document.createElement("div");
      div.id = "servo-"+s.Name;
      div.className = "form-inline";

      var label = document.createElement("label");
      label.innerText = s.Name + ", value: ";
      div.appendChild(label);

      var value = document.createElement("label");
      value.id = "servo-value-"+s.Name;
      value.innerText = s.Value.toString()
      div.appendChild(value);

      var angle = document.createElement("input");
      angle.id = "servo-angle-"+s.Name;
      angle.type = "range";
      angle.min = "0";
      angle.max = "180";
      angle.onmouseup = updateServoAngle(s.Name);
      angle.ontouchend = angle.onmouseup;
      div.appendChild(angle);

      ele.appendChild(div)
    }

    var value = document.getElementById("servo-value-"+s.Name);
    if (value.innerText != s.Value.toString()) {
      console.log("updating servo: "+s.Name);
      value.innerText = s.Value.toString();
      var angle = document.getElementById("servo-angle-"+s.Name);
      angle.value = s.Value;
    }
  }
}

function updateServoAngle(name) {
  return function(event) {
    updateValueFunction("/api/servos", name, event.target.value)();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateValueFunction(path, name, value) {
  return function() {
    console.log("update: "+name+ ", value: "+ value);
    var updateRequest = new XMLHttpRequest();
    updateRequest.open("POST", path, true)
    updateRequest.setRequestHeader("Authorization", "Basic "+btoa("admin:feathers"))
    var data = new FormData();
    data.append("name", name);
    data.append("value", ""+value);
    //TODO read response
    updateRequest.send(data);
  }
}
