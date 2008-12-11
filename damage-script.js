
function $E (str, opts) {
	if (!opts) opts = { data: {} };

	var t, cur = opts.parent || document.createDocumentFragment(), ret = {}, stack = [cur];
	while (str.length) {
		if (str.indexOf("<") == 0) {
			if ((t = str.match(/^\s*<(\/?[^\s>\/]+)([^>]+?)?(\/)?>/))) {
				var tag = t[1], attrs = t[2], isempty = !!t[3];
				if (tag.indexOf("/") == -1) {
					child = document.createElement(tag);
					if (attrs) attrs.replace(/([a-z]+)=(?:'([^']+)'|"([^"]+)")/gi,
						function (m, name, v1, v2) {
							var v = text(v1 || v2);
							if (name == "class") ret[v] = child;
							child.setAttribute(name, v);
						}
					);
					cur.appendChild(ret.root ? child : (ret.root = child));
					if (!isempty) {
						stack.push(cur);
						cur = child;
					}
				} else cur = stack.pop();
			} else throw("Parse Error: " + str);
		} else {
			if ((t = str.match(/^([^<]+)/))) cur.appendChild(document.createTextNode(text(t[0])));
		}
		str = str.substring(t[0].length);
	}

	function text (str) {
		return str
			.replace(/&(#(x)?)?([^;]+);/g, function (_, isNumRef, isHex, ref) {
				return isNumRef ? String.fromCharCode(parseInt(ref, isHex ? 16 : 10)):
				                  {"lt":"<","gt":"<","amp":"&"}[ref];
			})
			.replace(/#\{([^}]+)\}/g, function (_, name) {
				return opts.data[name];
			});
	}

	return ret;
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

			var button = $E("<div class='spinbutton'><div class='up'>+</div><div class='down'>-</div></div>");
			input.after(button.root);

			var h = input.height() + 3;

			$(button.root).css({
				position: "relative",
				fontSize: h / 2,
				lineHeight: 1
			});

			$(button.up)
				.css({
					position: "absolute",
					display: "block",
					top: 0,
					height: h / 2
				})
				.click(function () {
					input.val(opts.handler(input.val(), 1));
					input.change();
				});

			$(button.down)
				.css({
					position: "absolute",
					display: "block",
					top: h / 2 + 3,
					height: h / 2
				})
				.click(function () {
					input.val(opts.handler(input.val(), -1));
					input.change();
				});
		});
	}
});


function MabinogiDamageCalculator () { this.init.apply(this, arguments) }
MabinogiDamageCalculator.prototype = {
	init : function (template, parent) {
		var self = this;

		this.form = $E(template, { parent: parent });

		$.each(MabinogiDamageCalculator.Inputs, function (i) {
			var name = this;
			var input = $(self.form[name]);
			input
				.change(function () {
					if (self.form[name].value !== "") {
						self.calc();
					}
				})
				.keyup(function () {
					$(this).change();
				});

			if (input.attr("title") == "integer") input.spinbox();
		});

		self.calc();
	},

	calc : function () {
		var self = this;

		var graph  = [];
		var expdmg = MabinogiDamageCalculator.calcExpectation(
			Number(self.form.min.value),
			Number(self.form.max.value),
			Number(self.form.balance.value),
			function (pr, i) {
				graph.push({ dmg: i, pr: pr });
			}
		);

		self.drawGraph(graph);

		$(self.form.expectation).html(expdmg.toFixed(2));

		self.form.criticalrank.value = self.form.criticalrank.value.toUpperCase();


		var critical  = Number(self.form.critical.value) / 100;
		var adddamage = Number(self.form.max.value) * (MabinogiDamageCalculator.CriticalRank[self.form.criticalrank.value] / 100);

		var expdmgwithcri = expdmg + adddamage * critical;
		$(self.form.criticalexpectation).html(expdmgwithcri.toFixed(2));
	},

	drawGraph : function (graph) {
		var self = this;
		$(self.form.graph).empty();

		var max = graph.slice(0).sort(function (a, b) { return b.pr - a.pr })[0];
		var w   = $(self.form.graph).width() / graph.length;
		for (var i = 0; i < graph.length; i++) {
			var d = graph[i];
			var bar = $E("<div class='graphbar' title='#{dmg} #{pr}'>#{dmg}</div>", { parent: self.form.graph, data: d });
			with (bar.root.style) {
				height = (d.pr / max.pr) * 100 + "%";
				width  = w + "px";
				left   = w * i + "px";
			}
		}

		$E("<div>最もよくでるダメージ値: #{dmg} その確率: #{pr}%</div>", { parent: self.form.graph, data: {
			dmg: max.dmg,
			pr: (max.pr * 100).toFixed(2)
		} });
	}
};
MabinogiDamageCalculator.calcExpectation = function (min, max, balance, cb) {
	if (min > max) max = min;

	var variance = 0.0835 * Math.pow(max - min, 2);
	var average  = (max - min) * (balance / 100) + min;

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
};

MabinogiDamageCalculator.Inputs = ["min", "max", "critical", "criticalrank", "balance"];
MabinogiDamageCalculator.CriticalRank = {
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
};

$(function () {
	var template = $("#calc-template").val();
	var parent   = $("#calc-template").parent();
	new MabinogiDamageCalculator(template, parent[0]);
});
