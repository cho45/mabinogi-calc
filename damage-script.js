
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


		// 離散値として計算するのでΣで簡略化 & 高速化
		function sigma (a, b, fun) {
			var ret = 0;
			for (var i = a; i < b; i++) {
				ret += fun(i);
			}
			return ret;
		}

		// 正規分布確率密度関数生成関数
		function make_normal_distribution_pdf (variance, average) {
			var a = (1 / (Math.sqrt(variance) * Math.sqrt(2 * Math.PI)));
			var b = 2 * variance;
			return function (x) {
				return a * Math.exp(-(Math.pow(x - average, 2) / b));
			};
		}

		function expectation (min, max, balance) {
			var variance = 0.0835 * Math.pow(max - min, 2);
			var average  = (max - min) * (balance / 100) + min;

			var pdf = make_normal_distribution_pdf(variance, average);

			var emin = min && sigma(0,    min, function (x) { return pdf(x) }) * min;
			var emid =        sigma(min,  max, function (x) { return x * pdf(x) });
			var emax = max && sigma(max, 1000, function (x) { return pdf(x) }) * max;
			return emin + emid + emax;
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
