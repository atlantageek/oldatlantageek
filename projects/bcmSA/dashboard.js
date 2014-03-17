var sa_config = {stop: 1000000, start: 50000, trace_on: true, max_on: false, min_on: false, dBm: 'dBmV', reference: 50, range: 110, width: 800, height: 500, averaging: 10, rbw: 300, marker_mode: 'No Channel Mode'};
var markers = [null, null];
var hmarkers = [null, null];
var hist_data=new HistTraceData();
var snapshot_trace = [];
var min_data = [];
var max_data = [];
var socket; // = io.connect('http://192.168.100.110:8000');
var canvas;
var canvas2;
var canvas3;
var ctx;
var ctx2;
var ctx3;
var playing = false;
var db;
var traces=[];
color_table = ["rgba(255,255,255,0.9)", "rgba(255,128,0,0.9)", "rgba(255,255,0,0.9)", "rgba(0,255,0,0.9)", "rgba(0,255,255,0.9)", "rgba(0.928,255,0.9)", "rgba(0,0,255,0.9)", "rgba(128,0,255,0.9)", "rgba(255,0,255,0.9)", "rgba(255,0.928,0.9)", "rgba(255,0,0,0.9)"];
cold_hot_table = [ "rgba(255,0,0)", "rgba(255,16,0)", "rgba(255,32,0)", "rgba(255,48,0)", "rgba(255,64,0)", "rgba(255,80,0)", "rgba(255,96,0)", "rgba(255,112,0)",
"rgba(255,128,0)", "rgba(255,144,0)", "rgba(255,160,0)", "rgba(255,176,0)", "rgba(255,192,0)", "rgba(255,208,0)", "rgba(255,224,0)", "rgba(255,240,0)", "rgba(255,255,0)",
"rgba(240,255,0)", "rgba(224,255,0)", "rgba(208,255,0)", "rgba(192,255,0)", "rgba(176,255,0)", "rgba(160,255,0)", "rgba(144,255,0)", "rgba(128,255,0)", "rgba(112,255,0)",
"rgba(96,255,0)", "rgba(80,255,0)", "rgba(64,255,0)", "rgba(48,255,0)", "rgba(32,255,0)", "rgba(16,255,0)"];

if (typeof MozWebSocket != "undefined") {
    socket = new MozWebSocket(get_appropriate_ws_url(), "rpc-frontend");
} else {
    socket = new WebSocket(get_appropriate_ws_url(), "rpc-frontend");
}
try {
    socket.onopen = function() {
        pause_play();
    }

    socket.onclose = function() {}
} catch (exception) {
    alert('<p>Error' + exception);
}

trace_obj = new TraceObj;
socket.onmessage = function(data) {trace_obj.process_message(data);}


var BrowserDetect = {
    init: function() {
        this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
        this.version = this.searchVersion(navigator.userAgent) || this.searchVersion(navigator.appVersion) || "an unknown version";
        this.OS = this.searchString(this.dataOS) || "an unknown OS";
    },
    searchString: function(data) {
        for (var i = 0; i < data.length; i++) {
            var dataString = data[i].string;
            var dataProp = data[i].prop;
            this.versionSearchString = data[i].versionSearch || data[i].identity;
            if (dataString) {
                if (dataString.indexOf(data[i].subString) != -1)
                    return data[i].identity;
            } else if (dataProp)
                return data[i].identity;
        }
    },
    searchVersion: function(dataString) {
        var index = dataString.indexOf(this.versionSearchString);
        if (index == -1) return;
        return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
    },
    dataBrowser: [{
        string: navigator.userAgent,
        subString: "Chrome",
        identity: "Chrome"
    }, {
        string: navigator.userAgent,
        subString: "OmniWeb",
        versionSearch: "OmniWeb/",
        identity: "OmniWeb"
    }, {
        string: navigator.vendor,
        subString: "Apple",
        identity: "Safari",
        versionSearch: "Version"
    }, {
        prop: window.opera,
        identity: "Opera",
        versionSearch: "Version"
    }, {
        string: navigator.vendor,
        subString: "iCab",
        identity: "iCab"
    }, {
        string: navigator.vendor,
        subString: "KDE",
        identity: "Konqueror"
    }, {
        string: navigator.userAgent,
        subString: "Firefox",
        identity: "Firefox"
    }, {
        string: navigator.vendor,
        subString: "Camino",
        identity: "Camino"
    }, { // for newer Netscapes (6+)
        string: navigator.userAgent,
        subString: "Netscape",
        identity: "Netscape"
    }, {
        string: navigator.userAgent,
        subString: "MSIE",
        identity: "Explorer",
        versionSearch: "MSIE"
    }, {
        string: navigator.userAgent,
        subString: "Gecko",
        identity: "Mozilla",
        versionSearch: "rv"
    }, { // for older Netscapes (4-)
        string: navigator.userAgent,
        subString: "Mozilla",
        identity: "Netscape",
        versionSearch: "Mozilla"
    }],
    dataOS: [{
        string: navigator.platform,
        subString: "Win",
        identity: "Windows"
    }, {
        string: navigator.platform,
        subString: "Mac",
        identity: "Mac"
    }, {
        string: navigator.userAgent,
        subString: "iPhone",
        identity: "iPhone/iPod"
    }, {
        string: navigator.platform,
        subString: "Linux",
        identity: "Linux"
    }]

};
BrowserDetect.init();
//document.getElementById("brow").textContent = " " + BrowserDetect.browser + " "
//        + BrowserDetect.version +" " + BrowserDetect.OS +" ";
//
//

function HistTraceData()
{
  this.hist_data = [];
  this.pos=0;
  this.curr_trace = [];
  this.recent_trace = function()
  {
    return this.curr_trace;
  }
  this.update = update;
  function inverse_log_trace(trace_data)
  {
    var result=[];
    var i;
    for (i=0;i<trace_data.length;i++)
    {
      result[i] = Math.pow(10,trace_data[i]);
    }
    return result;
  }
  function update(trace_data)
  {
    inv_log = inverse_log_trace(trace_data);
    this.pos = this.pos % sa_config.averaging;
    this.hist_data[this.pos]= inv_log //trace_data.slice(0);
    this.pos = this.pos + 1
  }
  this.pull_trace = function()
  {
    var cnt=0;
    var total=[];
    var result=[];
    for (var j=0; j<this.hist_data[0].length;j++)
    {
      total[j] = 0  ;
    }
    for (var i=0; i<sa_config.averaging;i++)
    {
      if (typeof this.hist_data[i] != 'undefined')
      {
        for (var j=0;j < this.hist_data[i].length;j++)
        {
          total[j] += this.hist_data[i][j] ;
        }
      }
    }
    for (var j=0;j < total.length;j++)
    {
      val_j = total[j] / Math.min(sa_config.averaging, this.hist_data.length);
      result[j] = log10(val_j);
    }
    this.curr_trace = result.slice(0);
    return result;
  }

}

function db_convert(val) {
  if (sa_config.dBm == 'dBm' )
    { result = val;}
  else if (sa_config.dBm == 'dBmV' )
    {result = val + 48.7506;}
  else if (sa_config.dBm == 'dBuV' )
    {result = val + 108.7506;}
  return Math.round(result * 10.0) / 10.0;
}

function get_appropriate_ws_url() {
    var pcol;
    var u = document.URL;
    /* Temporarily Force the websocket to be hardcoded to cm */
    return "ws://69.70.200.239:8080/Frontend";

    /*
     * We open the websocket encrypted if this page came on an
     * https:// url itself, otherwise unencrypted
     */

    if (u.substring(0, 5) == "https") {
        pcol = "wss://";
        u = u.substr(8);
    } else {
        pcol = "ws://";
        if (u.substring(0, 4) == "http")
            u = u.substr(7);
    }

    u = u.split('/');

    return pcol + u[0];
}


function bwd_to_pixels(bwd) {
    var canvas = document.getElementById("mycanvas");
    freq_range = sa_config.stop - sa_config.start;
    width = canvas.width;
    pixel_width = Math.round( (bwd * width/freq_range));
    return pixel_width;
}
function bwd_to_idx_count(bwd,trace) {
    var canvas = document.getElementById("mycanvas");
    freq_range = sa_config.stop - sa_config.start;
    width = trace.length;
    pixel_width = Math.round( (bwd * width/freq_range));
    return pixel_width;
}

function pos_to_idx(pos, trace_data) {
    var canvas = document.getElementById("mycanvas");
    freq_range = sa_config.stop - sa_config.start;
    width = canvas.width;
    index = Math.round(trace_data.length * pos / (width ));
    return index;
}

function pos_to_freq(pos) {
    var canvas = document.getElementById("mycanvas");
    freq_range = sa_config.stop - sa_config.start;
    return Math.round(pos * freq_range / 1000.0 + sa_config.start)/1000.0;
}
divH = divW = 0;

function checkResize() {
    var w = $("#canvasesdiv").width();
    var h = $("#canvasesdiv").height();

    if (w != divW || h != divH) {
        $("#mycanvas").width(w);
        $("#mycanvas2").width(w);
        $("#mycanvas3").width(w);
        $("#mycanvas").height(h);
        $("#mycanvas2").height(h);
        $("#mycanvas3").height(h);
        ctx3 = canvas3.getContext("2d");
        ctx3.width=0;
        ctx3.width=canvas.width;
        draw_grid();
        /*what ever*/
        divH = h;
        divW = w;
    }
}
function generate_csv_file() {
  var trace_data = hist_data.curr_trace;
  var A = [['Frequency']];  // initialize array of rows with header row as 1st item
  if (sa_config.trace_on) { A[0].push('Trace'); }
  if (sa_config.max_on) { A[0].push('Max Hold'); }
  if (sa_config.min_on) { A[0].push('Min Hold'); }
  for(var j=1;j<trace_data.length;++j){ 
    freq = (sa_config.stop - sa_config.start) * (j-1) / trace_data.length
    val = trace_data[j]
    data =[Math.round(freq) / 1000.0]
    if (sa_config.trace_on) { data.push(db_convert(val)); }
    if (sa_config.max_on) { data.push(db_convert(max_data[j])); }
    if (sa_config.min_on) { data.push(db_convert(min_data[j])); }
    A.push(data);
  }
  var csvRows = [];
  for(var i=0,l=A.length; i<l; ++i){
    csvRows.push(A[i].join(','));   // unquoted CSV row
  }
  var csvString = csvRows.join("%0A");

  var a = document.createElement('a');
  a.href     = 'data:attachment/csv,' + csvString;
  a.target   = '_blank';
  a.download = 'spectrum.csv';
  document.body.appendChild(a);
  a.click();
}
function calculate_marker_power(trace_data) {
    //antilog data
    if ((markers[0] == null) || (markers[1] == null))
    {
      return;
    }
    start_pos = Math.min(markers[0], markers[1]);
    stop_pos = Math.max(markers[0], markers[1]);
    start = start_pos * trace_data.length / canvas.width;
    stop = stop_pos * trace_data.length / canvas.width;
    return calculate_power(trace_data, start, stop);
}

function calculate_power(trace_data,start,stop) {
    power = 0;
    for (var i = start; i < stop; i++) {
      power += Math.pow(10, (trace_data[Math.floor(i)] / 10))
    }
    return 10 * (log10(power));
}

function initdb()
{
   var openRequest = indexedDB.open("trace_snapshots",1);
 
        openRequest.onupgradeneeded = function(e) {
            console.log("running onupgradeneeded");
            var thisDB = e.target.result;
 
            if(!thisDB.objectStoreNames.contains("snapshots")) {
                thisDB.createObjectStore("snapshots");
            }
 
        }
 
        openRequest.onsuccess = function(e) {
            console.log("Success!");
            $("#store_button").removeAttr("disabled");
            db = e.target.result;
            update_snapshot_select();
        }
 
        openRequest.onerror = function(e) {
            console.log("Error");
            console.dir(e);
        }
}

function addtrace()
{
  key = $("#snapshot_title").val()
  if (key.trim() == "")
  {
    alert("Snapshot title required");
    return;
  }
  console.log("Adding trace " + key);
  var transaction = db.transaction(["snapshots"], "readwrite");
  var store = transaction.objectStore("snapshots");
  
  var trace_obj = {trace: hist_data.recent_trace(), name: key};
  var request = store.add(trace_obj, key);
  request.onsuccess = function(e) {
    $("#snapshot_title").val("")
    update_snapshot_select();
  }
}

function update_snapshot_select() 
{
  $("#snapshot_select").empty();
  $("#snapshot_select").append(new Option( 'No Snapshot Selected.',"No Snapshot Selected"));
  var transaction = db.transaction(["snapshots"], "readonly");
  var objectStore = transaction.objectStore("snapshots");
 
  var cursor = objectStore.openCursor();
  cursor.onsuccess = function(e) {
    var res = e.target.result;
    if(res) {
        console.log("Key", res.key);
         $("#snapshot_select").append(new Option(res.key, res.key));
        res.continue();
    }
  }
} 

function update_snapshot_view()
{
  key= $("#snapshot_select option:selected").val();
  var transaction = db.transaction(["snapshots"], "readonly");
  var objectStore = transaction.objectStore("snapshots");
  var query = objectStore.get(key);
  query.onsuccess = function(e) {
    result = e.target.result
    if (typeof result == 'undefined')
    {snapshot_trace = []; }
    else {snapshot_trace = e.target.result.trace;}
  }
  
}

$(function() {
    //Enable Store button maybe
     if("indexedDB" in window) {
        initdb();
    }
    setInterval(update_snapshot_select, 5000);
    divW = jQuery("canvasdiv").width;
    divH = jQuery("canvasdiv").height;
    jQuery(window).resize(checkResize);
    var timer = setInterval(checkResize, 1000);
    canvas = document.getElementById("mycanvas");
    canvas2 = document.getElementById("mycanvas2");
    canvas3 = document.getElementById("mycanvas3");
    ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(canvas.width, 0);
  ctx.lineTo(canvas.width, canvas.height - 23);
  ctx.lineTo(0, canvas.height-23);
  ctx.lineTo(0,0);
  //ctx.fillStyle='green';
  ctx.clip();
    ctx2 = canvas2.getContext("2d");
  ctx2.beginPath();
  ctx2.moveTo(0,0);
  ctx2.lineTo(canvas.width, 0);
  ctx2.lineTo(canvas.width, canvas.height - 23);
  ctx2.lineTo(0, canvas.height-23);
  ctx2.lineTo(0,0);
  //ctx.fillStyle='green';
  ctx2.clip();
    draw_grid();
    $("#reference").val((sa_config.reference).toString() );
    $("#reference").focusout(function() { update_reference(parseInt($("#reference").val()));});
    $("#snapshot_select").change(update_snapshot_view);

    $("#start_freq").val((sa_config.start / 1000).toString() );
    $("#stop_freq").val((sa_config.stop / 1000).toString() );
    $("#start_freq").focusout(function() { 
      start = parseInt($("#start_freq").val());
      stop =  parseInt($("#stop_freq").val());
      if (( start > stop) || ( start < 0))
      {
         $("#start_freq").val((sa_config.start / 1000).toString() );
      }
      sa_config.start = parseInt($("#start_freq").val()) * 1000;
      update_center_bwd();
    })
    $("input[type=text]").keyup(function(event) {
          if(event.keyCode == 13){ 
            max_hold_checkbox.focus();
          }
    });
    $("#stop_freq").focusout(function() { 
      start = parseInt($("#start_freq").val());
      stop =  parseInt($("#stop_freq").val());
      if (( start > stop) || (stop > 1000))
      {
         $("#stop_freq").val((sa_config.stop / 1000).toString() );
      }
      sa_config.stop = parseInt($("#stop_freq").val()) * 1000;
      console.log( "HERE we go");
      update_center_bwd();
    });

    $("#center_freq").focusout(center_bwd_changed);
    $("#bandwidth").focusout(center_bwd_changed);
    $("#divisions").change(update_divisions);
    $("#averaging").change(update_averaging);
    $("#rbw").change(update_rbw);

    $("#trace_checkbox").click(trace_click);
    $("#max_hold_checkbox").click(max_click);
    $("#min_hold_checkbox").click(min_click);
    update_center_bwd();
    $('div.btn-group[data-toggle-name]').each(function() {
        var group = $(this);
        var form = group.parents('form').eq(0);
        var name = group.attr('data-toggle-name');
        var hidden = $('input[name="' + name + '"]', form);
        $('button', group).each(function() {
            $(this).on('click', function() {
                hidden.val($(this).data("toggle-value"));
            });
        });
    });

    $("#mycanvas3").on('click', function(e) {
        var x = (e.pageX - $("#mycanvas2").offset().left);
        var width = hist_data.pull_trace().length;
        x_idx = x * width / $("#mycanvas2").width();
        var y = (e.pageY - $("#mycanvas2").offset().top);
        y_idx = y * sa_config['height'] / $("#mycanvas2").height();
        var marker = $("input[name=testOption]");
        if (marker.val() == 'marker1') { markers[0] = x * 1000.0 /  $("#mycanvas2").width();}
        if (marker.val() == 'marker2') { markers[1] = x * 1000.0 /  $("#mycanvas2").width();}
        if (marker.val() == 'hmarker1') { hmarkers[0] = y; }
        if (marker.val() == 'hmarker2') { hmarkers[1] = y; }
      update_markers();
    });

});

function update_markers()
{
        if (markers[0] != null ) {
            freq = pos_to_freq(markers[0]);
            $('#marker1_freq').html(freq  );
            if (markers[1] != null )
            {
              freq0 = pos_to_freq(markers[1]);
              $('#freq_delta').html(Math.round(Math.abs(freq - freq0)* 1000.0)/1000.0);
            }

        } 
        if (markers[1] != null) {
            freq = pos_to_freq(markers[1]);
            $('#marker2_freq').html(freq );
            if (markers[0] != null )
            {
              freq0 = pos_to_freq(markers[0]);
              $('#freq_delta').html(Math.round(Math.abs(freq - freq0)* 1000.0)/1000.0);
            }
        } 

}

function update_divisions()
{
  $("#divisions option:selected").each (function() {
    sa_config.range = parseInt($(this).text());
    draw_grid();
  });
}
function update_averaging()
{
  $("#averaging option:selected").each (function() {
    sa_config.averaging = parseInt($(this).val());
  });
}
function update_rbw()
{
  trace_obj.reset_trace();
  $("#rbw option:selected").each (function() {
    sa_config.rbw = parseInt($(this).val());
  });
}

function pos_to_db(pos)
{
   db_level = Math.round((sa_config["reference"] - sa_config["range"] * pos /sa_config['height']) * 10.0 ) / 10.0;
   return db_level
}
function update_reference(val) {
  sa_config.reference = val;
  draw_grid();
}
function trace_click() {
  sa_config.trace_on = $(this).is(':checked') ;
}
function max_click() {
  sa_config.max_on = $(this).is(':checked') ;
}
function min_click() {
  sa_config.min_on = $(this).is(':checked') ;
}
function center_bwd_changed() {
      center = parseInt($("#center_freq").val());
      bwd =  parseInt($("#bandwidth").val());
      if ( (center + bwd/2) > 1000)
      {
         center = (sa_config.stop - sa_config.start) / 2 + sa_config.start
         bwd = (sa_config.stop - sa_config.start) 
         $("#center_freq").val((center / 1000).toString() );
         $("#bandwidth").val((bwd / 1000).toString() );
      }
      else if ( (center - bwd/2) < 0)
      {
         center = (sa_config.stop - sa_config.start) / 2 + sa_config.start
         bwd = (sa_config.stop - sa_config.start) 
         $("#center_freq").val((center / 1000).toString() );
         $("#bandwidth").val((bwd / 1000).toString() );
      }
  bandwidth = parseInt($("#bandwidth").val()) * 1000;
  center_freq = parseInt($("#center_freq").val()) * 1000;
  sa_config.start = center_freq - bandwidth / 2 ;
  sa_config.stop = center_freq + bandwidth / 2 ;
  $("#start_freq").val((sa_config.start / 1000).toString() );
  $("#stop_freq").val((sa_config.stop / 1000).toString() );
  update_center_bwd();
  update_options();
}
function update_options()
{
}
function update_center_bwd() {
  trace_obj.reset_trace();
  bandwidth = sa_config.stop - sa_config.start
  center_freq = bandwidth / 2 + sa_config.start
  $("#bandwidth").val((bandwidth / 1000).toString() );
  $("#center_freq").val((center_freq / 1000).toString() );
  update_markers();
  draw_grid();
}
function clear_markers()
{
  reset_markers();
}

function reset_markers()
{
  $("[name='testOption']").val("");
  $(".btn.active").removeClass('active');
  for (marker_index=0;marker_index<2;marker_index++)
  {
    hmarkers[marker_index] = null;
    markers[marker_index] = null;
    $('#marker' + (marker_index + 1) + '_level').html('');
    $('#marker' + (marker_index + 1) + '_max').html('');
    $('#marker' + (marker_index + 1) + '_min').html('');
  }
}

function log10(val)
{
  return Math.log(val) / Math.log(10);
}

function draw_grid() {
    ctx3 = canvas3.getContext("2d");
    ctx3.clearRect(0,0,canvas3.width, canvas2.height );
    ctx3.width=0;
    ctx3.width=canvas.width;
    ctx3.lineWidth = 1;
    ctx3.strokeStyle = "rgba(99,0,0,0.2)";
    ctx3.fillStyle = "rgba(0,0,0,0.5)";
    ctx3.font = "32px Arial";
    var diff = canvas.height / sa_config.range;
    var lower_bound = sa_config.reference - sa_config.range;
    for (bar = lower_bound + 5; bar < sa_config.reference; bar += 5) {
        ctx3.beginPath();
        ctx3.font = "10px Georgia";
        ctx3.moveTo(0, (bar - lower_bound) * diff);
        ctx3.lineTo(canvas.width, (bar - lower_bound) * diff);
        ctx3.stroke();
        ctx3.lineWidth = 1;
        ctx3.strokeStyle = "rgba(99,0,0,0.2)";
        ctx3.fillText(bar.toString(), 0, canvas.height - ((bar - lower_bound) * diff));
        //ctx3.fillText(bar.toString(), canvas.width / 2 - 15, canvas.height - ((bar - lower_bound) * diff));
        ctx3.fillText(bar.toString(), canvas.width - 30, canvas.height - ((bar - lower_bound) * diff));
    }
    var width = canvas.width;
    freq_width = sa_config.stop - sa_config.start;
    var width_iter = width / 4;
    freq_iter = freq_width / 4;
    freq_pos = sa_config.start + freq_iter;
    for (var i=0;i<=4;i++)
    {
      ctx3.moveTo( width_iter * i, 0);
      ctx3.lineTo(width_iter * i, canvas.height - 20);
        ctx3.stroke();
      freq_pos = i * freq_iter;
      var str = (Math.round((freq_pos + sa_config.start)/1000)).toString() + " MHz" ;
      metrics = ctx3.measureText(str);
      if (i == 0 ) {ctx3.fillText(str, 10 , canvas.height - 10)}
      else if (i == 4 ) {ctx3.fillText(str, width_iter * i - metrics.width/2 - 30 , canvas.height - 10)}
      else {ctx3.fillText(str, width_iter * i - metrics.width/2 , canvas.height - 10)}
    }
}

function select_marker(marker_id) {
    this.id
}

function db_uom() {
    if (sa_config.dBm == 'dBm')
      {return 'dBm';}
    else if (sa_config.dBm == 'dBmV')
      {return 'dBmV';}
    else if (sa_config.dBm == 'dBuV')
      {return 'dBuV';}
}

function change_to_dBm()
{
  if (sa_config.dBm == 'dBmV')
  {
    update_reference(sa_config.reference - 50);
  }
  else if (sa_config.dBm == 'dBuV')
  {
    update_reference(sa_config.reference - 110);
  }
  sa_config.dBm = 'dBm';
  $("#reference").val((sa_config.reference).toString() );
  $(".db_meas").each( function(index) {$(this).html('dBm')});
}
function change_to_dBmV()
{
  if (sa_config.dBm == 'dBm')
  {
    update_reference(sa_config.reference + 50);
  }
  else if (sa_config.dBm == 'dBuV')
  {
    update_reference(sa_config.reference - 60);
  }
  sa_config.dBm = 'dBmV';
  $("#reference").val((sa_config.reference).toString() );
  $(".db_meas").each( function(index) {$(this).html('dBmV')});
}

function change_to_dBuV()
{
  if (sa_config.dBm == 'dBm')
  {
    update_reference(sa_config.reference + 110);
  }
  else if (sa_config.dBm == 'dBmV')
  {
    update_reference(sa_config.reference + 60);
  }
  sa_config.dBm = 'dBuV';
  $("#reference").val((sa_config.reference).toString() );
  $(".db_meas").each( function(index) {$(this).html('dBuV')});
}
function channel_width()
{
  if (sa_config.marker_mode == '6 MHz mode')
  {return 6000;}
  else if (sa_config.marker_mode == '8 MHz mode')
  {return 8000;}
  else if (sa_config.marker_mode == 'ZeroSpan')
  {return -1;}
}
function change_to_6MHz()
{
  sa_config.marker_mode= '6 MHz mode';
}
function change_to_8MHz()
{
  sa_config.marker_mode= '8 MHz mode';
}
function change_to_zero_span()
{
  sa_config.marker_mode= 'No Channel Mode';
}
function marker_mode_chg() {
  if (sa_config.marker_mode == 'No Channel Mode') {
	change_to_6MHz();
  	$("#marker_mode_toggle").html('8 MHz mode');
  }
  else if (sa_config.marker_mode == '6 MHz mode') {
	change_to_8MHz();
  	$("#marker_mode_toggle").html('No Channel Mode');
  }
  else if (sa_config.marker_mode == '8 MHz mode') {
	change_to_zero_span();
  	$("#marker_mode_toggle").html('6 MHz mode');
  }
 $(".current_marker_mode").html(sa_config.marker_mode);
}
function dbm_dbmv() {
    if (sa_config.dBm == 'dBm') {
      change_to_dBmV();
      $("#dbmtoggle").html('dBuV');
    } else if (sa_config.dBm == 'dBmV') {
      change_to_dBuV();
      $("#dbmtoggle").html('dBm');
    } else if (sa_config.dBm == 'dBuV') {
      change_to_dBm();
      $("#dbmtoggle").html('dBmV');
    }
}
function pause_play() {
    if (playing) {
        playing = false;
        $("#pauseplay").html('Play');
        socket.send('{"jsonrpc":"2.0","method":"Frontend::FrontendSpectrumClose","params":{"coreID":0},"id":"2"}');
    } else {
        playing = true;
        $("#pauseplay").html('Pause');
        var start = sa_config.start * 1000;
        var stop = sa_config.stop * 1000;
        var sample_count = (sa_config.stop - sa_config.start) / sa_config.rbw
        console.log('Sample Count' + sample_count);
        socket.send('{"jsonrpc":"2.0","method":"Frontend::FrontendSpectrumOpen","params":{"coreID":0},"id":"2"}');
        socket.send('{"jsonrpc":"2.0","method":"Frontend::GetFrontendSpectrumData","params":{"coreID":0,"fStartHz":' + start + ',"fStopHz":' + stop  + ',"fftSize":2048,"gain":1,"numOfSamples":500},"id":"0"}');
    }
}

function reset_extremes() {
    var tmp = max_data;
    max_data = min_data;
    min_data = tmp;
}

function do_range(i, data) {
    if (min_data.length <= i) {
        min_data[i] = data;
        max_data[i] = data;
    } else if (min_data[i] > data) {
        min_data[i] = data;
    } else if (max_data[i] < data) {
        max_data[i] = data;
    }

}
// dist - horizontal distance between points in trace data.
// hdist - vertical distance between points in trace data.
function draw_extremes(trace_data, dist, hdist) {
    ctx2.strokeStyle = 'green';
    ctx2.lineWidth = 0;

    //bounds
    if (sa_config.min_on) {
      ctx2.beginPath();
      ctx2.moveTo(0, -1 * hdist * (db_convert(min_data[0]) - sa_config.reference));
      for (var i = 1; i < trace_data.length; i++) {
        ctx2.lineTo(i * dist, -1 * hdist * (db_convert(min_data[i]) - sa_config.reference));
      }
      ctx2.stroke();
    }
    if (sa_config.max_on) {
      ctx2.beginPath();
      ctx2.moveTo(0, -1 * hdist * (db_convert(max_data[0]) - sa_config.reference));
      for (var i = 1; i < trace_data.length; i++) {
        ctx2.lineTo(i * dist, -1 * hdist * (db_convert(max_data[i]) - sa_config.reference));
      }
      ctx2.stroke();
    }
}


function draw_trace(trace_data, dist, hdist)
{
  if (sa_config.trace_on)
  {
    ctx.strokeStyle = 'red';
    ctx.linewidth = 1;
    ctx.beginPath();
    var y = -1 * hdist * (db_convert(trace_data[0]) - sa_config.reference);
    ctx.moveTo(0, -1 * hdist * (db_convert(trace_data[0]) - sa_config.reference));
    console.log(trace_data.length); 
    for (var i = 0; i < trace_data.length; i++) {
      y = -1 * hdist * (db_convert(trace_data[i]) - sa_config.reference);
      ctx.lineTo(i * dist, y);
      do_range(i, trace_data[i]);
    }
    ctx.stroke();
  }
  if ( snapshot_trace.length > 0 )
  {
    ctx.strokeStyle = 'blue';
    ctx.linewidth = 0.2;
    ctx.beginPath();
    var y = -1 * hdist * (db_convert(snapshot_trace[0]) - sa_config.reference);
    ctx.moveTo(0, -1 * hdist * (db_convert(snapshot_trace[0]) - sa_config.reference));
    console.log(snapshot_trace.length); 
    for (var i = 0; i < snapshot_trace.length; i++) {
      y = -1 * hdist * (db_convert(snapshot_trace[i]) - sa_config.reference);
      ctx.lineTo(i * dist, y);
      do_range(i, snapshot_trace[i]);
    }
    ctx.stroke();
    
  }
}
//-40 - -100

function draw_markers(trace_data, dist, hdist)
{
    var colors = ['blue', 'red'];
    var powers = [];
    var alpha_colors = ['rgba(0,0,192,0.6)', 'rgba(192,0,0,0.6)'];
    for (var marker_index = 0; marker_index < 2; marker_index++) {
        if (markers[marker_index] != null) {
//We are doing the main line now.
            ctx2.beginPath();
            ctx2.strokeStyle = colors[marker_index];
            ctx2.moveTo(markers[marker_index], 0);
            ctx2.lineTo(markers[marker_index], canvas.height);
            ctx2.stroke();
            idx = pos_to_idx(markers[marker_index], trace_data);
//We are doing the borders now.
            if (channel_width() > 0)
            {
              ctx2.lineWidth = bwd_to_pixels(channel_width());
              ctx2.strokeStyle = alpha_colors[marker_index];
              ctx2.moveTo(markers[marker_index], 0);
              ctx2.lineTo(markers[marker_index], canvas.height);
              ctx2.stroke();
              idx_size = bwd_to_idx_count(channel_width(), trace_data);
              power_start_idx = Math.round(idx - idx_size/2 );
              power_stop_idx = Math.round(idx_size/2 + idx);
              powers[marker_index] = calculate_power(trace_data,power_start_idx, power_stop_idx);
              $('#marker' + (marker_index + 1) + '_level').html(db_convert(calculate_power(trace_data,power_start_idx, power_stop_idx)));
              $('#marker' + (marker_index + 1) + '_max').html('--');
              $('#marker' + (marker_index + 1) + '_min').html('--');
            }
            else
            {
              powers[marker_index] = trace_data[idx];
              $('#marker' + (marker_index + 1) + '_level').html(db_convert(trace_data[idx]) );
              $('#marker' + (marker_index + 1) + '_max').html(db_convert(max_data[idx]));
              $('#marker' + (marker_index + 1) + '_min').html(db_convert(min_data[idx]));
            }

            ctx2.lineWidth = 1;
        }
    }
    if ((markers[0] != null) && (markers[1] != null))
    {
        idx1 = pos_to_idx(markers[0], trace_data);
        idx2 = pos_to_idx(markers[1], trace_data);
        if (channel_width() > 0)
        {
          $('#delta_level').html(Math.abs(Math.round((db_convert(powers[0]) - db_convert(powers[1])) * 10.0)/10.0));
          $('#delta_max').html('--');
          $('#delta_min').html('--');
        }
        else
        {
          $('#delta_level').html(Math.round((db_convert(trace_data[idx2]) - db_convert(trace_data[idx1])) * 10.0) / 10.0 );
          $('#delta_max').html(Math.round((db_convert(max_data[idx2]) - db_convert(max_data[idx1])) * 10.0) / 10.0);
          $('#delta_min').html(Math.round((db_convert(min_data[idx2]) - db_convert(min_data[idx1])) * 10.0) / 10.0);
        }
    }
    var hpowers=[];
    for (var marker_index = 0; marker_index < 2; marker_index++) {
        if (hmarkers[marker_index] != null) {
            ctx2.beginPath();
            ctx2.strokeStyle = colors[marker_index];
            ctx2.lineWidth = 1;
            ctx2.moveTo(0, hmarkers[marker_index]);
            ctx2.lineTo(canvas.width, hmarkers[marker_index]);
            ctx2.stroke();
            db_level = pos_to_db(hmarkers[marker_index]).toString() + " " + db_uom();
            ctx2.fillText(db_level, 100, hmarkers[marker_index] + 10);
            ctx2.fillText(db_level, 300, hmarkers[marker_index] - 4);
            ctx2.fillText(db_level, 500, hmarkers[marker_index] + 10);
            ctx2.fillText(db_level, 700, hmarkers[marker_index] - 4);
            attr='#hmarker' + (marker_index + 1) + '_level'
            $(attr).html(db_level );
            hpowers[marker_index] = pos_to_db(hmarkers[marker_index])
        }
    }
    if ((hmarkers[0] != null) && (hmarkers[1] != null))
    {
      $('#hdelta_level').html(''+Math.round(Math.abs(hpowers[1]-hpowers[0]) * 10.0) / 10.0 + 'dB');
    }
}
function TraceObj() {
  var trace=[];
}
TraceObj.prototype.reset_trace = function()
{
  trace = [];
}
TraceObj.prototype.process_message = function(data_json) {
  if (!playing) {
      return;
  }

  trace = trace || [];
  
  var lower_bound = sa_config.reference - sa_config.range;
  try {
      data_obj = JSON.parse(data_json.data);
  } catch (e) {
      console.log(data_json.data);
      alert(e);
  }
  for(var i=0;i<data_obj.result.length;i++)
  {
     trace.push(data_obj.result[i] / 256);
  }
  var start = sa_config.start * 1000;
  var stop = sa_config.stop * 1000;
  var try_sample_count = (stop - start) / (sa_config.rbw * 1000);
  var sample_count = Math.min(try_sample_count,2000);
  if (try_sample_count <= 2000) 
  {
    draw_and_stack_trace(trace);
    request_trace(start, stop, sample_count);
    trace=[];
  }
  else
  {
    if (try_sample_count <= trace.length) // Clip off the extra.
    {
       clip_start_idx = 0;
       clip_stop_idx = Math.ceil((sa_config.stop - sa_config.start) / sa_config.rbw);
       draw_and_stack_trace(trace.slice(clip_start_idx, clip_stop_idx));
       trace=[];
    }
    start = sa_config.start + trace.length *sa_config.rbw ;
    stop =  start + sample_count * sa_config.rbw ;
    //cnt = min(sample_count , (stop-start) / sa_config.rbw);
    request_trace(start * 1000, stop * 1000, sample_count );
  }
    
}
function draw_and_stack_trace(trace)
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    hist_data.update(trace);
    trace = hist_data.pull_trace();
    power = calculate_marker_power(trace);
    if (typeof power == 'undefined')
    {
      $('#power_meas').html("<em> Not Active</em>");
    }
    else
    {
      $('#power_meas').html((" " + db_convert(power)  + " " + db_uom()));
    }
    var dist = canvas.width / (trace.length - 1);
    var hdist = canvas.height / sa_config.range;
    draw_extremes(trace, dist, hdist);
    draw_trace(trace, dist, hdist);
    draw_markers(trace, dist, hdist);
}
function request_trace(start, stop, sample_count)
{
    console.log('Sample Count' + sample_count);
    trace_req = {"jsonrpc":"2.0","method":"Frontend::GetFrontendSpectrumData","params":{"coreID":0,"fStartHz": start,"fStopHz": stop,"fftSize":2048,"gain":1,"numOfSamples": sample_count },"id":"0"}
    socket.send(JSON.stringify(trace_req));
    //socket.send('{"jsonrpc":"2.0","method":"Frontend::GetFrontendSpectrumData","params":{"coreID":0,"fStartHz":' + start + ',"fStopHz":' + stop  + ',"fftSize":2048,"gain":1,"numOfSamples":2048},"id":"0"}');


}
