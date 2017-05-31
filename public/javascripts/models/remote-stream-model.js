function RemoteStream(id, stream, audioContext) {
  var self = this;
  self.id = id;
  self.stream = stream;
  self.script = audioContext.createScriptProcessor(2048, 1, 1);
  self.script.onaudioprocess = function(event) {
    var input = event.inputBuffer.getChannelData(0);
    var i;
    var sum = 0.0;
    var clipcount = 0;
    for (i = 0; i < input.length; ++i) {
      sum += input[i] * input[i];
      if (Math.abs(input[i]) > 0.99) {
        clipcount += 1;
      }
    }
    self.instant = Math.sqrt(sum / input.length);
  };

  self.source = audioContext.createMediaStreamSource(stream);
  self.source.connect(self.script);
  self.script.connect(audioContext.destination);

  self.disconnect = function () {
    self.source.disconnect();
    self.script.disconnect();
  }
}