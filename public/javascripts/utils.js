//Enables bootstrap tooltips
$(function () {
	$("[data-toggle='tooltip']").tooltip();
});

function toggleFullScreen() {
	var element;
	var requestMethod;

	var isInFullScreen = document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen || document.msIsFullScreen;
	if (!isInFullScreen) {
		element = document.documentElement;
		requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen || element.msRequestFullScreen;
	} else {
		element = document;
		requestMethod = element.cancelFullScreen || element.webkitCancelFullScreen || element.mozCancelFullScreen || element.msCancelFullscreen || element.msCancelFullScreen;
	}

	if (requestMethod) { // Native full screen.
		requestMethod.call(element);
	} else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
		var wscript = new ActiveXObject("WScript.Shell");
		if (wscript !== null) {
			wscript.SendKeys("{F11}");
		}
	}
}