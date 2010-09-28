
function simpleEncode (valueArray, maxValue) {
	var simpleEncoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	var chartData = ['s:'];
	for (var i = 0; i < valueArray.length; i++) {
		var currentValue = valueArray[i];
		if (!isNaN(currentValue) && currentValue >= 0) {
			chartData.push(simpleEncoding.charAt(Math.round((simpleEncoding.length-1) * currentValue / maxValue)));
		}
		else {
			chartData.push('_');
		}
	}
	return chartData.join('');
}


function log (m) {
	if (window.console) console.log(m);
}

$.fn.extend({
	spinbox : function (opts) {
		if (!opts) opts = {};
		if (!opts.handler) opts.handler = function (prev, direction) {
			return Number(prev) + direction;
		};

		return this.each(function () {
			var input = $(this);

			var button = $("<div class='spinbutton'><div class='up'>+</div><div class='down'>-</div></div>");
			input.after(button);

			var h = input.height() + 3;

			button.css({
				display: "inline-block",
				verticalAlign: "top",
				width: "1.2em",
				position: "relative",
				fontSize: h / 2,
				lineHeight: 1
			});

			button.find('.up')
				.css({
					width: "1em",
					cursor: "default",
					textAlign: "center",
					position: "absolute",
					display: "block",
					top: 0,
					height: h / 2 * 1.33
				})
				.click(function () {
					input.val(opts.handler(input.val(), 1));
					input.change();
					return false;
				});

			button.find('.down')
				.css({
					width: "1em",
					cursor: "default",
					textAlign: "center",
					position: "absolute",
					display: "block",
					top: h / 2 + 3,
					height: h / 2
				})
				.click(function () {
					input.val(opts.handler(input.val(), -1));
					input.change();
					return false;
				});
		});
	}
});


MabinogiDamageCalculator = {
	calcExpectation : function (min, max, balance, cb) {
		if (!cb) cb = function () {};
		if (min > max) max = min;

		var variance = 0.0835 * Math.pow(max - min, 2);
		var average  = (max - min) * (balance / 100) + min;

		// 正規分布の累積分布関数生成関数
		function make_normal_distribution_function (variance, average) {
			var a   = Math.sqrt(variance) * Math.sqrt(2);
			var erf = function (x) {
				return ((x < 0.0) ? -1 : 1) * Math.pow(1.0 - Math.exp(-1.27323954 * x * x), 0.5);
			};

			return function (x) {
				return (1 + erf((x - average) / a)) / 2;
			};
		}

		var nd = make_normal_distribution_function(variance, average);
		var pr = function (x) {
			switch (true) {
				case x <  min: return 0;
				case x == min: return nd(x + 1);
				case x == max: return 1 - nd(x);
				case x >  max: return 0;
				default:       return nd(x + 1) - nd(x);
			}
		};

		var ret = 0, t = 0;
		for (var i = min; i <= max; i++) {
			t = pr(i);
			cb(t, i);
			ret += t * i;
		}

		return ret;
	},

	calcCriticalAddtionalDamageExpectation : function (max, critical, criticalrank) {
		criticalrank = criticalrank.toUpperCase();
		critical     = Number(critical) / 100;

		var adddamage = Number(max) * (MabinogiDamageCalculator.CriticalRank[criticalrank] / 100);

		return adddamage * critical;
	},

	CriticalRank : {
		F: 50,
		E: 55,
		D: 60,
		C: 65,
		B: 70,
		A: 75,
		9: 90,
		8: 95,
		7: 100,
		6: 105,
		5: 110,
		4: 120,
		3: 130,
		2: 140,
		1: 150
	}
};

function openScreenshotInput () {
	$('#upload').dialog('open');
}

$(function () {
	$('#input input').
		change(function () {
			var min = $('#damage-min').val();
			var max = $('#damage-max').val();
			var cri = $('#critical').val();
			var crr = $('#criticalrank').val().toUpperCase();
			var bln = $('#balance').val();

			var graph = [];
			var expdmg = MabinogiDamageCalculator.calcExpectation(
				Number(min),
				Number(max),
				Number(bln),
				function (pr, i) {
					graph.push({ dmg: i, pr: pr });
				}
			);

			drawGraph(graph);

			$('#expectation').text(expdmg.toFixed(2));

			var expdmgwithcri = expdmg + MabinogiDamageCalculator.calcCriticalAddtionalDamageExpectation(
				Number(max),
				Number(cri > 30 ? 30 : cri),
				crr
			);

			$('#expectation-cri').text(expdmgwithcri.toFixed(2));
			$('#expectation-cri30').text((cri - 30) / 2);

			function drawGraph (graph) {
				var max = graph.slice(0).sort(function (a, b) { return b.pr - a.pr })[0];
				var data = [];
				for (var i = 0, len = graph.length; i < len; i++) {
					data[i] = Math.round((graph[i].pr / max.pr) * 1000) / 10;
				}

				var uri = 'http://chart.apis.google.com/chart?';
				uri += '&chf=bg,s,262626';
				uri += '&chs=390x200';
				uri += '&cht=lc';
				uri += '&chxt=x,y';
				uri += '&chxs=0,FFFFFF|1,FFFFFF';
				uri += '&chxl=';
				uri +=   '0:|' + graph[0].dmg + '|' + graph[graph.length-1].dmg + '|';
				uri +=   '1:|0%|' + (max.pr * 100).toFixed(2) + '%';
				uri += '&chd=t:' + data.join(',');

				$('#graph img').attr('src', uri);
			}
		}).
		change();

	var upload = $('#upload').dialog({
		autoOpen: false,
		width: 700,
		modal: true,
		resizable: false
	});

	upload.
		find('.close').
			click(function () {
				upload.dialog("close");
			}).
		end().
		find('input[name=image]').
			change(function () {
				$(this).upload('/extract.cgi', function (res) {
					res = eval(res.match(/<textarea>([\s\S]+)<\/textarea>/)[1]);
					var damage = res.damage.split(/~/);
					$('#critical').val(res.critical);
					$('#balance').val(res.balance);
					$('#damage-min').val(damage[0]);
					$('#damage-max').val(damage[1]).change();
					upload.dialog("close");
				});
			}).
		end();
});


