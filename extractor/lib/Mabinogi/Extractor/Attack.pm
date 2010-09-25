package Mabinogi::Extractor::Attack;

use strict;
use warnings;
use base qw(Class::Data::Inheritable);
__PACKAGE__->mk_classdata('templates' => {});

use Path::Class;
our $TEMPLATE_DIR = file(__FILE__)->parent->subdir('tmpl');
our $DEBUG = 0;
use Carp;

use Imager;
use Inline with => 'Imager';
use Inline C => <<'EOS';
void template_match(Imager::ImgRaw img, Imager::ImgRaw tmpl, int all) {
	int x, y, tx, ty;
	i_color tmp_color;
	unsigned char img_color, tmpl_color;
	unsigned char is_white;
	// printf("img: w:%d h:%d, tmpl: w:%d, h:%d\n", img->xsize, img->ysize, tmpl->xsize, tmpl->ysize);

	Inline_Stack_Vars;
	Inline_Stack_Reset;

	for (y = 0; y < img->ysize - tmpl->ysize; y++) for (x = 0; x < img->xsize - tmpl->xsize; x++) {
		// if (img->ysize == 50 && y == 1) printf("(x:%d, y:%d)\n", x, y);
		for (ty = 0; ty < tmpl->ysize; ty++) for (tx = 0; tx < tmpl->xsize; tx++) {
			i_gpix(tmpl, tx, ty, &tmp_color);
			tmpl_color = tmp_color.gray.gray_color;
			if (tmpl_color == 255) {
				i_gpix(img, x + tx, y + ty, &tmp_color);
				img_color  = tmp_color.gray.gray_color;
				is_white = img_color == 255;
				if (!is_white) goto next;
			} else
			if (tmpl_color ==   0) {
				i_gpix(img, x + tx, y + ty, &tmp_color);
				img_color  = tmp_color.gray.gray_color;
				is_white = img_color == 255;
				if (is_white) goto next;
			}
		}

		Inline_Stack_Push(sv_2mortal(newSViv(x)));
		Inline_Stack_Push(sv_2mortal(newSViv(y)));
		if (!all) goto done;

		next:;
	}

	done:;
	Inline_Stack_Done;
}
EOS

sub _template {
	my ($class, $name) = @_;
	unless ($class->templates->{$name}) {
		$class->templates->{$name} = do {
			my $img = Imager->new;
			$img->read(file => $TEMPLATE_DIR->file("$name.png"));
			$img;
		};
	}
	$class->templates->{$name};
}

sub extract {
	my ($class, $image) = @_;

	my $tmpl = $class->_template('attack');
	$tmpl = $tmpl->crop(left => 1, top => 1); # 枝刈り用に白が最初にくるように調整

	my $img = Imager->new;
	$img->read(file => $image) or croak $img->errstr;
	$img = $img->convert(preset => 'grey');
	$img = $img->map(all => [ map { $_ > 127 ? 255 : 0 } (0..255)  ]);

	$DEBUG and ($img->write(file => '/tmp/test.png', type => 'png') or die $img->errstr);

	my ($x, $y);
	($x, $y) = template_match($img, $tmpl, 0);
	defined $x or croak "couldn't find template";
	$img = $img->crop(left => $x + 15, top => $y + 10, width => 80, height => 55) or die $img->errstr;

	$DEBUG and ($img->write(file => '/tmp/test.png', type => 'png') or die $img->errstr);

	my $numbers = [
		map {
			+{
				n => $_,
				tmpl => $class->_template($_),
			};
		}
		(0 .. 9, '~', '.')
	];

	my $chars = {};
	for my $number (@$numbers) {
		my @matched = template_match($img, $number->{tmpl}, 1);
		my $n = $number->{n};
		while (my ($x, $y) = splice @matched, 0, 2) {
			$chars->{$y}{$x} = $n;
		}
	}

	my $res = [];
	for my $y (qw/2 15 28 41/) {
		push @$res, '';
		for my $x (sort { $a <=> $b } keys %{ $chars->{$y} }) {
			$res->[-1] .= $chars->{$y}{$x};
		}
	}

	my %ret;
	@ret{qw/damage wound critical balance/} = @$res;
	\%ret;
}


1;
__END__



