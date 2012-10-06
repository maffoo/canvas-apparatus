$(document).ready(function() {

// canvases
var appCanvas = $("#apparatus").get(0);
var drawCanvas = $("#drawing").get(0);
var drawCanvasR = $("#drawing-r").get(0);

// create ember app
var App = Ember.Application.create({
  simulationInterval: 5,
  centerDotRadius: 5,
  jointDotRadius: 3,
  dragging: ''
});
window.App = App; // make App globally visible, e.g. so views can see it

//a TextField that only updates its value when it is a valid number
App.NumField = Ember.TextField.extend({
  _elementValueDidChange: function() {
    var value = parseFloat(this.$().val());
    if (!isNaN(value)) {
      this.set('value', value);
    }
  }
});

// Apparatus class
App.Apparatus = Ember.Object.extend({
  
  // run this apparatus forward by one step
  step: function(drawApparatus, drawFigure) {
    var t = this.incrementProperty('t');
    this.calculateState();
        
    if (drawApparatus) this.drawApparatus();
    if (drawFigure) this.drawFigure();
    
    // save current coordinates
    this.updatePrev(this);
  },
  
  reset: function() {
    this.set('t', 0);
    this.clearFigure();
    this.drawApparatus();
    this.step(false, false);
  },
  
  updatePrev: function(from) {
    points = ['pen', 'j1', 'j2', 'cross', 'penR', 'j1R', 'j2R', 'crossR'];
    for (var i = 0; i < points.length; i++) {
      var attr = points[i] + 'Prev';
      this[points[i] + 'Prev'] = from[points[i]];
    }
  },
  
  // drawing functions
  drawApparatus: function() {
    var w = appCanvas.width,
        h = appCanvas.height,
        ctx = appCanvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(w/2, h/2);
    
    // circles
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ff8888';
    ctx.beginPath();
    var c1 = this.get('c1');
    var r1 = this.get('r1');
    var a1 = this.get('a1');
    ctx.arc(c1.x, c1.y, r1, 0, 2*Math.PI, true);
    ctx.stroke();
    
    ctx.strokeStyle = '#8888ff';
    ctx.beginPath();
    var c2 = this.get('c2');
    var r2 = this.get('r2');
    var a2 = this.get('a2');
    ctx.arc(c2.x, c2.y, r2, 0, 2*Math.PI, true);
    ctx.stroke();
    ctx.restore();
    
    // turning direction arrows
    function arrow(color, rate, center) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.translate(center.x, center.y);
      ctx.beginPath();
      var dir = rate > 0 ? -1 : 1;
      ctx.moveTo(-3, -6 * dir);
      ctx.lineTo(-3,  2 * dir);
      ctx.lineTo(-6,  2 * dir);
      ctx.lineTo( 0,  8 * dir);
      ctx.lineTo( 6,  2 * dir);
      ctx.lineTo( 3,  2 * dir);
      ctx.lineTo( 3, -6 * dir);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    arrow("rgba(255, 136, 136, 0.8)", this.get('rate1'), this.get('rateHandle1'));
    arrow("rgba(136, 136, 255, 0.8)", this.get('rate2'), this.get('rateHandle2'));
    
    // turntable radii
    drawLine(ctx, "#ff0000", [c1, a1]);
    drawLine(ctx, "#0000ff", [c2, a2]);

    // apparatus legs
    var j1 = this.j1;
    var j2 = this.j2;
    var cross = this.cross;
    var pen = this.pen;
    drawLine(ctx, "#228800", [a1, j1, pen, j2, a2]);

    var r = App.get('centerDotRadius');
    drawDot(ctx, "black", c1, r);
    drawDot(ctx, "black", c2, r);
    
    r = App.get('jointDotRadius');
    drawDot(ctx, "black", a1, r);
    drawDot(ctx, "black", a2, r);
    
    drawDot(ctx, "black", cross, r);
    drawDot(ctx, "black", j1, r);
    drawDot(ctx, "black", j2, r);    
    drawDot(ctx, "black", pen, r);

    if (this.get('doubleSided')) {
      var j1R = this.j1R;
      var j2R = this.j2R;
      var penR = this.penR;
      var crossR = this.crossR;
      drawLine(ctx, "#228800", [a1, j1R, penR, j2R, a2]);
            
      drawDot(ctx, "black", crossR, r);
      drawDot(ctx, "black", j1R, r);
      drawDot(ctx, "black", j2R, r);    
      drawDot(ctx, "black", penR, r);
    }
    ctx.restore();
  },
  
  clearFigure: function() {
    function clear(canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
    clear(drawCanvas);
    clear(drawCanvasR);
  },
  
  drawFigure: function() {
    var w = drawCanvas.width,
        h = drawCanvas.height;
    
    var ctx = drawCanvas.getContext('2d');
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.lineCap = 'round';
    if (this.get('drawLines')) {
      drawLine(ctx, 'black', [this.penPrev, this.pen]);
    }
    if (this.get('drawDots')) {
      drawDot(ctx, 'black', this.get('pen'), 1);
    }
    ctx.restore();
    
    ctx = drawCanvasR.getContext('2d');
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.lineCap = 'round';
    if (this.get('drawLines')) {
      drawLine(ctx, 'black', [this.penRPrev, this.penR]);
    }
    if (this.get('drawDots')) {
      drawDot(ctx, 'black', this.penR, 1);
    }
    ctx.restore();
  },
  
  redrawFigure: function() {
    obj = this.clone(); // make a clone that is not bound to control panel view
    obj.calculateState();
    obj.clearFigure();
    var tNow = obj.get('t');
    obj.set('t', Math.max(0, tNow - 1000)); // TODO: calculate max history length instead
    obj.step(false, false);
    while (obj.get('t') < tNow) {
      obj.step(false, true);
    }
    obj.drawApparatus();
    this.updatePrev(obj);
  },
  
  
  // event observers
  visibleChanged: function() {
    if (this.get('visible')) {
      $('#apparatus').show();
    } else {
      $('#apparatus').hide();
    }
  }.observes('visible'),
  
  doubleSidedChanged: function() {
    if (this.get('doubleSided')) {
      $('#drawing-r').show();
    } else {
      $('#drawing-r').hide();
    }
    this.drawApparatus();
  }.observes('doubleSided'),
  
  paramChanged: function() {
    this.redrawFigure();
  }.observes('c1y', 'c2y', 'r1', 'r2',
             'theta0_1', 'theta0_2',
             'rate1', 'rate2',
             'leg1', 'leg2', 'leg3',
             'drawLines', 'drawDots'),
  
  
  // computed properties
  c1: Ember.computed(function(key, value) {
    // getter
    if (arguments.length === 1) {
      return {x: this.get('c1x'), y: this.get('c1y')};
      
    } else {
      this.set('c1x', value.x);
      this.set('c1y', value.y)
    }
  }).property('c1x', 'c1y').cacheable(),

  c2: Ember.computed(function(key, value) {
    // getter
    if (arguments.length === 1) {
      return {x: this.get('c2x'), y: this.get('c2y')};
      
    } else {
      this.set('c2x', value.x);
      this.set('c2y', value.y)
    }
  }).property('c2x', 'c2y').cacheable(),
  
  theta1: Ember.computed(function(key, value) {
    // getter
    if (arguments.length === 1) {
      var theta0 = this.get('theta0_1'),
          t = this.get('t'),
          rate = this.get('rate1');
      return theta0 + 360 * t * rate / 20000;
    
    // setter
    } else {
      var theta = value,
          t = this.get('t'),
          rate = this.get('rate1');
      this.set('theta0_1', Math.round(value - 360 * t * rate / 20000) % 360);
    }
  }).property('theta0_1', 't', 'rate1').cacheable(),
  
  theta2: Ember.computed(function(key, value) {
    // getter
    if (arguments.length === 1) {
      var theta0 = this.get('theta0_2'),
          t = this.get('t'),
          rate = this.get('rate2');
      return theta0 + 360 * t * rate / 20000;
    
    // setter
    } else {
      var theta = value,
          t = this.get('t'),
          rate = this.get('rate2')
      this.set('theta0_2', Math.round(value - 360 * t * rate / 20000) % 360);
    }
  }).property('theta0_2', 't', 'rate2').cacheable(),
  
  a1: function() {
    var x = this.get('c1x'),
        y = this.get('c1y'),
        r = this.get('r1'),
        theta = this.get('theta1');
    return {'x': x + r * Math.cos(theta * Math.PI/180),
            'y': y + r * Math.sin(theta * Math.PI/180)};
  }.property('c1x', 'c1y', 'r1', 'theta1').cacheable(),
  
  a2: function() {
    var x = this.get('c2x'),
        y = this.get('c2y'),
        r = this.get('r2'),
        theta = this.get('theta2');
    return {'x': x + r * Math.cos(theta * Math.PI/180),
            'y': y + r * Math.sin(theta * Math.PI/180)};
  }.property('c2x', 'c2y', 'r2', 'theta2').cacheable(),
  
  
  // compute machine state
  calculateState: function() {
    var a1 = this.get('a1');
    var a2 = this.get('a2');
    var leg1 = this.get('leg1');
    var leg2 = this.get('leg2');
    var leg3 = this.get('leg3');
    
    var aDist = dist(a1, a2);
    var aDist2 = aDist / 2;
    var dCross = Math.sqrt(leg1*leg1 - aDist2*aDist2);
    var dLeg = leg2 * (dCross / leg1);
    var wLeg = Math.sqrt(leg2*leg2 - dLeg*dLeg);
    var dPen = Math.sqrt(leg3*leg3 - wLeg*wLeg);

    // compute midpoint between rotors and unit vectors
    var mid = {x: (a1.x + a2.x) / 2,
               y: (a1.y + a2.y) / 2};
    var perp = {x: (a2.x - a1.x) / aDist,
                y: (a2.y - a1.y) / aDist};
    var par = {x: perp.y, y: -perp.x};
    
    // compute locations of all parts of the machine
    this.pen =    {x: mid.x + par.x * (dCross + dLeg + dPen),
                   y: mid.y + par.y * (dCross + dLeg + dPen)};
    this.j1 =     {x: mid.x + par.x * (dCross + dLeg) + perp.x * wLeg,
                   y: mid.y + par.y * (dCross + dLeg) + perp.y * wLeg};
    this.j2 =     {x: mid.x + par.x * (dCross + dLeg) - perp.x * wLeg,
                   y: mid.y + par.y * (dCross + dLeg) - perp.y * wLeg};
    this.cross =  {x: mid.x + par.x * (dCross),
                   y: mid.y + par.y * (dCross)};
    this.penR =   {x: mid.x - par.x * (dCross + dLeg + dPen),
                   y: mid.y - par.y * (dCross + dLeg + dPen)};
    this.j1R =    {x: mid.x - par.x * (dCross + dLeg) + perp.x * wLeg,
                   y: mid.y - par.y * (dCross + dLeg) + perp.y * wLeg};
    this.j2R =    {x: mid.x - par.x * (dCross + dLeg) - perp.x * wLeg,
                   y: mid.y - par.y * (dCross + dLeg) - perp.y * wLeg};
    this.crossR = {x: mid.x - par.x * (dCross),
                   y: mid.y - par.y * (dCross)};
  },
  
  
  rateHandle1: function() {
    return {x: this.get('c1x') - 14, y: this.get('c1y')};
  }.property('c1x', 'c1y'),

  rateHandle2: function() {
    return {x: this.get('c2x') - 14, y: this.get('c2y')};
  }.property('c2x', 'c2y'),

  
  // support for location hashes
  makeHash: function() {
    return 'c1=' + this.get('c1y')
        + '&c2=' + this.get('c2y')
        + '&r1=' + this.get('r1')
        + '&r2=' + this.get('r2')
        + '&t1=' + this.get('theta0_1')
        + '&t2=' + this.get('theta0_2')
        + '&s1=' + this.get('rate1')
        + '&s2=' + this.get('rate2')
        + '&l1=' + this.get('leg1')
        + '&l2=' + this.get('leg2')
        + '&l3=' + this.get('leg3')
        + '&sa=' + (this.get('visible') ? 1 : 0)
        + '&ds=' + (this.get('doubleSided') ? 1 : 0)
        + '&dl=' + (this.get('drawLines') ? 1 : 0)
        + '&dd=' + (this.get('drawDots') ? 1 : 0);
  },
  
  parseHash: function(hash) {
    try {
      var allowedKeys = {
        'c1': 'c1y',
        'c2': 'c2y',
        'r1': 'r1',
        'r2': 'r2',
        't1': 'theta0_1',
        't2': 'theta0_2',
        's1': 'rate1',
        's2': 'rate2',
        'l1': 'leg1',
        'l2': 'leg2',
        'l3': 'leg3',
        'sa': 'visible',
        'ds': 'doubleSided',
        'dl': 'drawLines',
        'dd': 'drawDots'
      };
      var isBoolean = {
        'visible': true,
        'doubleSided': true,
        'drawLines': true,
        'drawDots': true
      };
      var elems = hash.substring(1).split('&');
      var changed = false;
      for (var i = 0; i < elems.length; i++) {
        var keyVal = elems[i].split('=');
        if (keyVal.length == 2 && allowedKeys.hasOwnProperty(keyVal[0])) {
          var key = keyVal[0];
          var value = parseFloat(keyVal[1]);
          if (isNaN(value)) continue;
          var prop = allowedKeys[key];
          if (isBoolean[prop]) {
            value = value != 0;
          }
          if (this.get(prop) != value) {
            this.set(prop, value);
            changed = true;
          }
        }
      }
      if (changed) this.reset();
    } catch (err) {
      // ignore
    }
  },
  
  
  // create a clone of this apparatus
  clone: function() {
    var params = {};
    var props = [
      'visible', 'doubleSided', 'running', 'drawLines', 'drawDots',
      'c1x', 'c1y', 'c2x', 'c2y', 'r1', 'r2', 'theta0_1', 'theta0_2',
      'rate1', 'rate2', 'leg1', 'leg2', 'leg3', 't'
    ];
    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      params[prop] = this.get(prop);
    }
    return App.Apparatus.create(params);
  }
});


// the main apparatus
App.apparatus = App.Apparatus.create({
  visible: true,
  doubleSided: true,
  running: true,
  
  drawLines: true,
  drawDots: false,
  
  // turntable centers
  c1x: 0, c1y: -50,
  c2x: 0, c2y: 50,
  
  // driver radii
  r1: 40,
  r2: 30,
  
  theta0_1: 0,
  theta0_2: 0,
  
  rate1: 240,
  rate2: 246,
  
  leg1: 90,
  leg2: 90,
  leg3: 100,
  
  t: 0
});


// control panel view
App.controlPanel = Ember.View.create({
  templateName: 'control-panel',
  apparatusBinding: 'App.apparatus',
  
  toggleRunning: function(event) {
    this.get('apparatus').toggleProperty('running');
  },
  
  toggleVisible: function(event) {
    this.get('apparatus').toggleProperty('visible');
  },
  
  toggleDoubleSided: function(event) {
    this.get('apparatus').toggleProperty('doubleSided');
  },
  
  toggleDrawLines: function(event) {
    this.get('apparatus').toggleProperty('drawLines');
  },
  
  toggleDrawDots: function(event) {
    this.get('apparatus').toggleProperty('drawDots');
  },
  
  reset: function(event) {
    this.get('apparatus').reset();
  },
  
  bookmark: function(event) {
    location.hash = App.apparatus.makeHash();
  }
});


// set up canvases to respond to window resize events and trigger initial resize
$(window).resize(function() {
  var w = appCanvas.width;
  var h = appCanvas.height;
  var wNew = $(window).width();
  var hNew = $(window).height();
  
  appCanvas.width = wNew;
  appCanvas.height = hNew;
  
  drawCanvas.width = wNew;
  drawCanvas.height = hNew;
  
  drawCanvasR.width = wNew;
  drawCanvasR.height = hNew;
  App.apparatus.redrawFigure();
});

// parse parameters from the url when the fragment changes
$(window).bind('hashchange', function() {
  App.apparatus.parseHash(location.hash);
});
    
// toggle the running state when spacebar is pressed
$("body").keyup(function(event) {
  switch (event.which) {
  case 32: // spacebar
    if (App.get('dragging') == '') {
      App.apparatus.toggleProperty('running');
    }
    break;
  }
});


// handle clicking and dragging
$("#apparatus").mousedown(function(event) {
  var app = App.apparatus
  
  // check whether the click happened on top of any control points
  var p = toCanvasPt(event);
  
  var targets = [
    'c1', 'c2', 'a1', 'a2',
    'cross', 'j1', 'j2', 'pen',
    'rateHandle1', 'rateHandle2'
  ];    
  if (app.get('doubleSided')) {
    targets = [
      'c1', 'c2', 'a1', 'a2',
      'cross', 'j1', 'j2', 'pen',
      'crossR', 'j1R', 'j2R', 'penR',
      'rateHandle1', 'rateHandle2'
    ];
  }
  for (var i = 0; i < targets.length; i++) {
    if (10 > dist(p, app.get(targets[i]))) {
      App.set('dragging', targets[i]);
      app.wasRunning = app.get('running');
      app.set('running', false);
      app.lastDragX = p.x;
      app.lastDragY = p.y;
      break;
    }
  }
});

$("#apparatus").mouseup(function(event) {
  var app = App.apparatus;
  if (App.get('dragging') != '') {
    App.set('dragging', '');
    app.set('running', app.wasRunning);
  }
});

$("#apparatus").mousemove(function(event) {
  var app = App.apparatus;
  var dragging = App.get('dragging');
  var updateNeeded = true;
  
  switch (dragging) {
  case 'c1':
    var c1 = toCanvasPt(event);
    c1 = {x: 0*Math.round(c1.x), y: Math.round(c1.y)};
    var c2 = {x: -c1.x, y: -c1.y};
    app.set('c1y', c1.y);
    app.set('c2y', c2.y);
    break;
    
  case 'c2':
    var c2 = toCanvasPt(event);
    c2 = {x: 0*Math.round(c2.x), y: Math.round(c2.y)};
    var c1 = {x: -c2.x, y: -c2.y};
    app.set('c1y', c1.y);
    app.set('c2y', c2.y);
    break;
    
  case 'a1':
    var a1 = toCanvasPt(event);
    var c1 = app.get('c1');
    var r1 = Math.round(dist(a1, c1));
    app.set('r1', r1);      
    app.set('theta1', 180/Math.PI * Math.atan2(a1.y - c1.y, a1.x - c1.x));
    break;
    
  case 'a2':
    var a2 = toCanvasPt(event);
    var c2 = app.get('c2');
    var r2 = Math.round(dist(a2, c2));
    app.set('r2', r2);
    app.set('theta2', 180/Math.PI * Math.atan2(a2.y - c2.y, a2.x - c2.x));
    break;
    
  case 'cross':
    var cross = toCanvasPt(event);
    app.set('leg1', Math.round(dist(app.get('a1'), cross)));
    break;
    
  case 'j1':
    var j1 = toCanvasPt(event);
    app.set('leg2', Math.round(dist(app.get('cross'), j1)));
    break;
    
  case 'j2':
    var j2 = toCanvasPt(event);
    app.set('leg2', Math.round(dist(app.get('cross'), j2)));
    break;
    
  case 'pen':
    var pen = toCanvasPt(event);
    app.set('leg3', Math.round(dist(app.get('j1'), pen)));
    break;
    
  case 'crossR':
    var cross = toCanvasPt(event);
    app.set('leg1', Math.round(dist(app.get('a1'), cross)));
    break;
    
  case 'j1R':
    var j1 = toCanvasPt(event);
    app.set('leg2', Math.round(dist(app.get('crossR'), j1)));
    break;
    
  case 'j2R':
    var j2 = toCanvasPt(event);
    app.set('leg2', Math.round(dist(app.get('crossR'), j2)));
    break;
    
  case 'penR':
    var pen = toCanvasPt(event);
    app.set('leg3', Math.round(dist(app.get('j1R'), pen)));
    break;
    
  case 'rateHandle1':
    var p = toCanvasPt(event);
    var dy = app.lastDragY - p.y;
    var y = app.get('rate1');
    y += dy;
    if (y == 0) {
      if (dy > 0) y = 1;
      if (dy < 0) y = -1;
    }
    app.set('rate1', y);
    break;
    
  case 'rateHandle2':
    var p = toCanvasPt(event);
    var dy = app.lastDragY - p.y;
    var y = app.get('rate2');
    y += dy;
    if (y == 0) {
      if (dy > 0) y = 1;
      if (dy < 0) y = -1;
    }
    app.set('rate2', y);
    break;
    
  default:
    updateNeeded = false;
  }
  
  if (updateNeeded) {
    app.redrawFigure();
    var p = toCanvasPt(event);
    app.lastDragX = p.x;
    app.lastDragY = p.y;
  }
});


// set up apparatus
App.apparatus.calculateState();
App.apparatus.set('doubleSided', false);
App.apparatus.parseHash(location.hash);
App.apparatus.step(true, false);

// add control panel to page
App.controlPanel.appendTo("#control-panel");

// trigger a resize to set up canvases
$(window).trigger('resize');

// start the machine running
window.setInterval(function() {
  var app = App.apparatus;
  if (app.get('running')) {
    app.step(true, true);
  }
}, App.get('simulationInterval'));




// Utility methods

// calculate the distance between two points
function dist(p1, p2) {
  var dx = p1.x - p2.x;
  var dy = p1.y - p2.y;
  return Math.sqrt(dx*dx + dy*dy);
}

// draw a line using the given drawing context
function drawLine(ctx, color, pts) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (var i = 0; i < pts.length; i++) {
    var pt = pts[i];
    if (i == 0) {
      ctx.moveTo(pt.x, pt.y);
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
  }
  ctx.stroke()
}

// draw a filled dot
function drawDot(ctx, color, pt, r) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, r, 0, 2*Math.PI, true);
  ctx.closePath();
  ctx.fill();
}

// convert event coordinates to canvas coordinates
function toCanvasPt(event) {
  return {
    x: event.pageX - appCanvas.offsetTop - appCanvas.width / 2,
    y: event.pageY - appCanvas.offsetLeft - appCanvas.height / 2
  };
}

});