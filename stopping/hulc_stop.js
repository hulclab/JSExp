/*
HULC Stopping Task 1.0.0
Licensed under GPL3: https://opensource.org/licenses/GPL-3.0
*/
var current_index = 0;
var current_trial = -1;
var current_action = false;
var current_img_count = 0;
var wait_keypress = false;
var trial_sound = false;
var exp_result = '';
var exp_time = 0;
var trial_time = 0;
var trial_timer = null;
function st_array_shuffle(array) {
  var i = 0, j = 0, temp = null;
  for (i = array.length - 1; i > 0; i -= 1) {
    j = Math.floor(Math.random() * (i + 1));
    temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
function timestamp(now, trial) {
  now = now || Date.now();
  var ret = new Date(now - exp_time).toISOString().substr(11,12);
  if (trial) {
    ret += " " + new Date(now - trial_time).toISOString().substr(11,12);
  }
  return ret;
}
function st_display_text(text, stop) {
	if ($('#screen0')) {
		$('#screen0').html(text).show();
	}
	wait_keypress = !stop;
}
function st_prepare_trials() {
	switch (experiment.randomize) {
		case 'type':
			var temp_trials = {};
			while (experiment.trials.length) {
				trial = experiment.trials.pop();
				if (!temp_trials[trial.type]) {
					temp_trials[trial.type] = [];
				}
				temp_trials[trial.type].push(trial);
			}
			var longest = false;
			for (let key of Object.keys(temp_trials)) {
				st_array_shuffle(temp_trials[key]);
				if (!longest || temp_trials[key].length > temp_trials[longest].length) {
					longest = key;
				}
			}
			experiment.trials = temp_trials[longest].reduce(function(arr, v, i) {
				arr = arr.concat(v);
				for (let key of Object.keys(temp_trials)) {
					if (key != longest && temp_trials[key][i]) {
						arr = arr.concat(temp_trials[key][i]);
					}
				}
				return arr;
			}, []);
			experiment.order = [];
			for (let key of experiment.trials.keys()) {
				experiment.order.push(experiment.trials[key].id);
			}
			experiment.order = experiment.order.join('\n');
      if (experiment.trial_randomize) {
        for (let key of experiment.trials.keys()) {
          st_array_shuffle(experiment.trials[key].images);
        }
      }
			break;
		default:
			if (experiment.randomize) {
				st_array_shuffle(experiment.trials);
			}
			break;
	}
}
function st_trial_next() {
	var next = experiment.trials[current_trial];
	if (next) {
    current_img_count = next.images.length;
    $('#screen1').empty();
    if (next.text_cue) {
        $('#screen1').append('<p>'+next.text_cue+'</p>');
    }
    for (let key of next.images.keys()) {
      if (next.names && next.names[key]) {
        if (experiment.show_names) {
          $('#screen1').append($('<div class="st_frame" id="'+next.names[key]+'"><img src="'+(experiment.img_path || '')+next.images[key]+'"/><div class="st_caption">'+next.names[key]+'</div></div>').css("visibility", "hidden"));
        } else {
          $('#screen1').append($('<img class="st_frame" src="'+(experiment.img_path || '')+next.images[key]+'" id="'+next.names[key]+'" title="'+next.names[key]+'"/>').css("visibility", "hidden"));
        }
      } else {
        $('#screen1').append($('<img class="st_frame" src="'+(experiment.img_path || '')+next.images[key]+'" id="'+next.images[key]+'" />').css("visibility", "hidden"));
      }
    }
    $('#screen1').append('<br />');
    if (next.audio_cue) {
  		var sources = Array.isArray(next.audio_cue) ? next.audio_cue.map(function(e){return (experiment.audio_path || '')+e;}) : [(experiment.audio_path || '')+next.audio_cue];
  		trial_cue = new Howl({src: sources, onload: function(){st_trial_start(next);}});
  	} else {
      trial_cue = null;
      st_trial_start(next);
    }
	} else {
		current_index++;
		current_trial = -1;
		st_next();
	}
}
function st_trial_start(next) {
  $('#screen1').show();
  trial_time = Date.now();
  exp_result += timestamp(trial_time) + " trial "+(current_trial + 1)+" start - "+(next.id || 'no id')+"\n";
  if (trial_cue) {
    trial_cue.play();
  } else if (trial_sound) {
    trial_sound.play();
  }
  $('#screen1').bind('click.STEvent', st_next);
  st_trial_show_next(experiment.begin_with_two);
  wait_keypress = true;
}
function st_trial_show_next(show_second) {
  if (trial_timer) {
    clearTimeout(trial_timer);
  }
  exp_result += timestamp(null, true) + " display " + $('.st_frame').filter(function() {
    return $(this).css('visibility') == 'hidden';
  }).first().css("visibility", "visible").attr('id') +"\n";
  if (show_second) {
    exp_result += timestamp(null, true) + " display " + $('.st_frame').filter(function() {
      return $(this).css('visibility') == 'hidden';
    }).first().css("visibility", "visible").attr('id') +"\n";
  }
  if ($('.st_frame').filter(function() {
    return $(this).css('visibility') == 'hidden';
  }).length) {
    trial_timer = setTimeout(st_trial_show_next, experiment.trial_timer || 1500);
  }
}
function st_trial_end(wait_complete) {
  $('#screen1').unbind('click.STEvent');
  if (trial_timer) {
    clearTimeout(trial_timer);
  }
  feedback_text = experiment.trials[current_trial].feedback_text;
	if (wait_complete) {
    if (experiment.trial_feedback && $('#trial_feedback')) {
      exp_result += timestamp(null, true) + " trial "+(current_trial + 1)+" feedback"+(feedback_text ? ' ('+feedback_text + ')' : '')+": "+$('#trial_feedback').val().trim()+"\n";
    }
		current_trial++;
		st_trial_next();
	} else {
		$('#screen1').hide();
    exp_result += timestamp(null, true) + " trial "+(current_trial + 1)+" end\n";
    if (experiment.trial_feedback) {
      $('#screen1').empty();
      $('#screen1').append((feedback_text ? feedback_text + '<br />' : '')+'<textarea id="trial_feedback"></textarea><br />');
      $('#screen1').append($('<button class="st_trial_button">'+(experiment.trial_button || 'Done')+'</button>').bind('click', function(e){st_trial_end(true);e.stopPropagation();}));
      $('#screen1').show();
      $('#trial_feedback').focus();
    } else {
      setTimeout(st_trial_end, experiment.blank_time || 100, true);
    }
	}
}
function skip_output() {
  current_index++;
  st_next();
}
function st_break() {
  exp_result += timestamp() + " experiment terminated by user \n";
  current_index = experiment.sequence.length - 1;
  current_trial = -1;
  st_next();
}

function st_next() {
	wait_keypress = false;
	$('body>div').hide();
	switch (current_action) {
		case 'examples':
		case 'display_text':
			current_index++;
			break;
		case 'trials':
			if (current_trial >= 0) {
				st_trial_end();
			}
			break;
    case 'output_result':
		default:
			break;
	}
	var next = experiment.sequence[current_index];
	if (next) {
		current_action = next.action;
		switch (current_action) {
			case 'display_text':
				st_display_text(next.text);
				break;
			case 'output_result':
				exp_result += timestamp() + " experiment end\n";
				st_display_text('experiment log<br /><br /><textarea id="experient_result" onclick="this.select();">Trial order:\n'+experiment.order+'\n\n'+exp_result+'</textarea><br /><button class="st_trial_button" onClick="st_feedback_copy()">Copy</button>', true);
				break;
			case 'trials':
				if (current_trial < 0) {
					current_trial = 0;
					st_trial_next();
				}
				break;
			default:
				break;
		}
    if (current_action != 'trials') {
      exp_result += timestamp() + " sequence "+current_index+": "+(next.name || current_action)+"\n";
    }
	} else {
		if ($('#screen0')) {
			$('#screen0').html($('<p>Restart experiment</p>').click(function (){
				st_start_experiment();
			})).show();
		}
	}
}
function st_start_experiment() {
	$('#screen0').html('<p>Starting...</p>');
	if (!document.fullscreenElement) {
		var docelem = document.documentElement;
		if (docelem.requestFullscreen) {
			docelem.requestFullscreen();
		}
		else if (docelem.mozRequestFullScreen) {
			docelem.mozRequestFullScreen();
		}
		else if (docelem.webkitRequestFullScreen) {
			docelem.webkitRequestFullScreen();
		}
		else if (docelem.msRequestFullscreen) {
			docelem.msRequestFullscreen();
		}
	}
	current_index = 0;
	current_trial = -1;
	current_action = false;
	st_prepare_trials();
  exp_time = Date.now();
  exp_result = new Date().toLocaleString() + " experiment start\n";
	st_next();
}
function st_feedback_copy() {
  if ($('#experient_result').length) {
    $('#experient_result').focus();
    $('#experient_result').select();
    try {
      if (document.execCommand('copy'))
      alert('Result copied to clipboard');
    } catch (err) {
      alert('Error copying result to clipboard');
      console.log(err);
    }
  }
}

$(document).ready(function(){
	$('body').keypress(function (e) {
		if (e.which == 32 && wait_keypress) {
			st_next();
			e.preventDefault();
		} else if (e.key == 'Pause') {
      st_break();
    }
	});
  $('body').click(function (e) {
		if (wait_keypress) {
			st_next();
			e.preventDefault();
    }
	});
	if (experiment) {
    $('body').append($('<div id="screen0" class="st_container">').hide());
    $('body').append($('<div id="screen1" class="st_container">').hide());
		if (experiment.trial_sound) {
			var sources = Array.isArray(experiment.trial_sound) ? experiment.trial_sound.map(function(e){return (experiment.audio_path || '')+e;}): [(experiment.audio_path || '')+experiment.trial_sound];
			trial_sound = new Howl({src: sources});
		}
		if ($('#screen0')) {
			$('#screen0').html($('<p>Click to start experiment</p>').click(function (){
				st_start_experiment();
			})).show();
		}
	}
});
