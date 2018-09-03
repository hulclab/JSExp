/*
HULC Modular Animated Stimuli Set 1.0.0 
Licensed under GPL3: https://opensource.org/licenses/GPL-3.0

based on icons from Font Awesome Free 5.0.6 by @fontawesome - http://fontawesome.com
License - http://fontawesome.com/license (Icons: CC BY 4.0)
*/
var current_index = 0;
var current_trial = -1;
var current_action = false;
var wait_keypress = false;
var question = false;
var trial_sound = false;
var as_color_classes = ['as_color_red', 'as_color_green', 'as_color_blue', 'as_color_orange', 'as_color_purple', 'as_color_yellow', 'as_color_pink', 'as_color_cyan', 'as_color_darkgreen', 'as_color_brown', 'as_color_magenta', 'as_color_gray'];
function as_array_shuffle(array) {
  var i = 0, j = 0, temp = null;
  for (i = array.length - 1; i > 0; i -= 1) {
    j = Math.floor(Math.random() * (i + 1));
    temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
function as_randomize_color(except) {
	var available = as_color_classes;
	if (Array.isArray(except)) {
		available = available.filter(function(c) {
			return !except.includes(c);
		});
	}
	else if (except) {
		available.splice(available.indexOf(except), 1);
	}
	as_array_shuffle(available);
	var i = 0;
	$('svg').removeClass(as_color_classes.join(' ')).each(function () {
		if (i >= available.length) {
			i = 0;
			as_array_shuffle(available);
		}
		$(this).addClass(available[i]);	
		i++;
	});	
}
function as_set_color(selector, color) {
	$(selector).removeClass(as_color_classes.join(' ')).addClass(color);
}
function as_display_text(text) {
	if ($('#screen0')) {
		$('#screen0').html(text).show();
	}
	wait_keypress = true;
}
function as_prepare_trials() {
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
				as_array_shuffle(temp_trials[key]);
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
			break;
		default: 
			if (experiment.randomize) {
				as_array_shuffle(experiment.trials);
			}
			break;
	}
}
function as_trial_next() {
	var next = experiment.trials[current_trial];
	if (next) {
		if (!next.question || question) {
			question = false;
			as_randomize_color(experiment.target_colors);
			var target_colors = Array.isArray(experiment.target_colors) ? experiment.target_colors[Math.floor(Math.random()*experiment.target_colors.length)] : experiment.target_colors;
			as_set_color(next.target, next.color || target_colors);
			$(next.screen).show();
			if (trial_sound) {
				trial_sound.play();
			}
			wait_keypress = true;				
		} else {
			question = true;
			as_display_text(next.question);			
		}
	} else {
		current_index++;
		current_trial = -1;
		as_next();
	}
}
function as_trial_end(wait_complete) {
	if (wait_complete) {
		if (!question) {
			current_trial++;
		}
		as_trial_next();		
	} else {
		$(experiment.trials[current_trial].screen).hide();
		setTimeout(as_trial_end, experiment.blank_time || 3000, true);
	}
}
function as_next() {
	wait_keypress = false;
	$('body>div').hide();
	switch (current_action) {
		case 'examples':
		case 'display_text': 
		case 'output_order':
			current_index++;
			break;
		case 'trials': 
			if (current_trial >= 0) {
				as_trial_end(question);
			}
			break;
		default:
			break;
	}
	var next = experiment.sequence[current_index];
	if (next) {
		current_action = next.action;
		switch (next.action) {
			case 'display_text': 
				as_display_text(next.text);
				break;
			case 'output_order':
				as_display_text('Trial order: <br /><pre>'+experiment.order+'</pre>');
				break;
			case 'examples':
				as_randomize_color(experiment.target_colors);
				if ($(next.id)) {
					$($(next.id)).show();
				}
				wait_keypress = true;
				break;
			case 'trials': 
				if (current_trial < 0) {
					current_trial = 0;
					as_trial_next();					
				}
				break;
			default:
				break;
		}
	} else {
		if ($('#screen0')) {
			$('#screen0').html($('<p>Restart experiment</p>').click(function (){
				as_start_experiment();
			})).show();
		}
	}
}
function as_start_experiment() {
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
	as_prepare_trials();
	as_next();
}
$(document).ready(function(){
	$('body').keypress(function (e) {
		if (e.which == 32 && wait_keypress) {
			as_next();
			e.preventDefault();
		}
	});
	if (experiment) {
		$('body').append('<div id="screen0" class="as_container">');
		if (experiment.screens) {
			$.each(experiment.screens, function(index, scr) {
				$('body').append('<div id="'+scr.id+'" class="as_container as_rows_'+scr.size+'" style="display: none;">');
				$.each(scr.content, function (index, con) {
					var container = $('<div></div>');
					if (Array.isArray(con)) {
						$.each(con, function(i,elem){
							container.append('<svg id="'+elem.id+'" class="'+elem.animation+'"><use xlink:href="'+elem.icon+'"></use></svg>');
							if (elem.description)
								container.append(elem.description);						
						});
					} else if (typeof con == "object"){
						container.append('<svg id="'+con.id+'" class="'+con.animation+'"><use xlink:href="'+con.icon+'"></use></svg>');						
						if (con.description)
							container.append(con.description);						
					} else if (con != "break") {
						container.append(con);						
					}
					if (con == "break") {
						$('#'+scr.id).append('<br />');
					} else {
						$('#'+scr.id).append(container);
					}
				});
			});
		}
		if (experiment.trial_sound) {
			var sources = Array.isArray(experiment.trial_sound) ? experiment.trial_sound : [experiment.trial_sound];
			trial_sound = new Howl({src: sources});	
		}
		if ($('#screen0')) {
			$('#screen0').html($('<p>Click to start experiment</p>').click(function (){
				as_start_experiment();
			})).show();
		}
	}
});