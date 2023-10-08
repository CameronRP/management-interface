"use strict";
window.onload = function () {
    getBatteryData();
};

async function getBatteryData() {
    try {
        var response = await apiGetJSON("/api/battery");
        console.log(response);
        $("#time").html(response.time);
        $("#main-battery-level").html(response.mainBattery);
        $("#rtc-battery-level").html(response.rtcBattery);
        
    } catch (e) {
        console.log(e);
    }
}

async function downloadBattery() {
    try {
        window.location.href = "/battery-download";
    } catch (e) {
        console.log(e);
        alert("failed to download battery CSV");
    }
}
