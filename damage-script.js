
$E = createElementFromString;



function MabinogiDamageCalculator () {
	this.init.apply(this, arguments);
}
MabinogiDamageCalculator.prototype = {
	init : function (template, parent) {
		var self = this;

		this.form = $E(template, { parent: parent });

		$.each(MabinogiDamageCalculator.Inputs, function (i) {
			var name = this;
			$(self.form[name]).keyup(function () {
				if (self.form[name].value !== "") {
					self.calc();
				}
			});
		});
	},

	calc : function () {
		var expdmg = expectation(
			Number(this.form.min.value),
			Number(this.form.max.value),
			Number(this.form.balance.value)
		);

		$(this.form.expectation).html(expdmg.toFixed(2));

		var critical  = Number(this.form.critical.value) / 100;
		var adddamage = Number(this.form.max.value) * (MabinogiDamageCalculator.CriticalRank[this.form.criticalrank.value] / 100);

		var expdmgwithcri = expdmg + adddamage * critical;
		$(this.form.criticalexpectation).html(expdmgwithcri.toFixed(2));


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

		function expectation (min, max, balance) {
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

			var ret = 0;
			for (var i = min; i <= max; i++) {
				ret += pr(i) * i;
			}

			return ret;
		}


	},
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
