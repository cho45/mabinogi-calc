
function $E (str, opts) {
	if (!opts) opts = { };
	if (!opts.data) opts.data = { };

	var t, cur = opts.parent || document.createDocumentFragment(), ret = {}, stack = [cur];
	while (str.length) {
		if (str.indexOf("<") == 0) {
			if ((t = str.match(/^\s*<(\/?[^\s>\/]+)([^>]+?)?(\/)?>/))) {
				var tag = t[1], attrs = t[2], isempty = !!t[3] || tag == "input";
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
				return (typeof(opts.data[name]) == "undefined") ? _ : opts.data[name];
			});
	}

	return ret;
}


function log (m) {
	if (window.console) console.log(m);
}

Array.prototype.dup = function () { // shallow copy
	return this.slice(0);
};

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
				display: "inline-block",
				verticalAlign: "top",
				width: "1.2em",
				position: "relative",
				fontSize: h / 2,
				lineHeight: 1
			});

			$(button.up)
				.css({
					width: "1em",
					cursor: "default",
					textAlign: "center",
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

MabinogiDamageCalculator.SingleCalculator = function () { this.init.apply(this, arguments) };
MabinogiDamageCalculator.SingleCalculator.Inputs = ["min", "max", "critical", "criticalrank", "balance"];
MabinogiDamageCalculator.SingleCalculator.prototype = {
	init : function (template, parent) {
		var self = this;
		self.form = $E(template, { parent: parent });

		$.each(MabinogiDamageCalculator.SingleCalculator.Inputs, function (i) {
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

		var expdmgwithcri = expdmg + MabinogiDamageCalculator.calcCriticalAddtionalDamageExpectation(
			Number(self.form.max.value),
			Number(self.form.critical.value),
			self.form.criticalrank.value
		);

		$(self.form.criticalexpectation).html(expdmgwithcri.toFixed(2));
	},

	drawGraph : function (graph) {
		var self = this;
		$(self.form.graph).empty();

		var max = graph.dup().sort(function (a, b) { return b.pr - a.pr })[0];
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
	},

	setValues : function (values) {
		var self = this;
		for (var k in values) if (values.hasOwnProperty(k)) {
			if (self.form.hasOwnProperty(k)) self.form[k].value = values[k];
		}
		self.calc();
	}
};

MabinogiDamageCalculator.MultiCalculator = function () { this.init.apply(this, arguments) };
MabinogiDamageCalculator.MultiCalculator.prototype = {
	init : function (template, parent) {
		var self = this;
		self.form = $E(template, { parent: parent });

		var input   = $(self.form.input);
		var button  = $(self.form.calcbtn);
		var table   = $(self.form.tablesorter);
		var tbody   = table.find("tbody");
		var tmpl    = tbody.html();
		table.tablesorter();
		tbody.empty();


		button.click(function () { try {
			var reference = null;

			var inputs = input.val().split(/\n/).map(function (d) {
				var data =  d.replace(/\s+/g, "").split(",");
				data = {
					description  : data[0],
					min          : data[1],
					max          : data[2],
					balance      : data[3],
					critical     : data[4],
					criticalrank : data[5]
				};
				if (!data.description) return null;

				if (data.description.match(/^\*/)) reference = data;

				return data;
			});

			log("ref");
			log(reference);

			tbody.empty();
			inputs.forEach(function (data) {
				if (!data) return;

				log(data);
				if (reference) {
					for (var k in data) if (data.hasOwnProperty(k)) {
						if (/^[+-]/.test(data[k])) data[k] = Number(data[k]) + Number(reference[k]);
					}
				}

				data.expectation   = MabinogiDamageCalculator.calcExpectation(
					Number(data.min),
					Number(data.max),
					Number(data.balance)
				);
				data.expdmgwithcri = data.expectation + MabinogiDamageCalculator.calcCriticalAddtionalDamageExpectation(
					Number(data.max),
					Number(data.critical),
					data.criticalrank
				);

				data.expectationout   = data.expectation.toFixed(2);
				data.expdmgwithcriout = data.expdmgwithcri.toFixed(2);

				if (reference) {
					log((Number(data.expectation), reference.expectation));
					data.expectationdelta   =  (data.expectation   - reference.expectation).toFixed(2);
					data.expdmgwithcridelta =  (data.expdmgwithcri - reference.expdmgwithcri).toFixed(2);
					data.mindelta           =  (data.min           - reference.min).toFixed(2);
					data.maxdelta           =  (data.max           - reference.max).toFixed(2);
					data.balancedelta       =  (data.balance       - reference.balance).toFixed(2);
					data.criticaldelta      =  (data.critical      - reference.critical).toFixed(2);
				}

				$E(tmpl, { parent: tbody[0], data : data });
			});

			var sorting = [ [6, 1], [7, 1] ];

			table.trigger("update");
			table.trigger("sorton", [sorting]);
		} catch (e) { alert(e) } });

		button.click();
	}
}

$(function () {
	var template = $("#calc-template").val();
	var parent   = $("#calc-template").parent();
	var single   = new MabinogiDamageCalculator.SingleCalculator(template, parent[0]);

	var template = $("#calcall").html();
	var parent   = $("#calcall").empty();
	var multi   = new MabinogiDamageCalculator.MultiCalculator(template, parent[0]);
});
