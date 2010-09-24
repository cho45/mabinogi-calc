package Mabinogi::Extractor::Attack;

use strict;
use warnings;

use Path::Class;
our $TEMPLATE_DIR = file(__FILE__)->parent->subdir('tmpl');
our $DEBUG = 0;
use Carp;

use Imager;
use Inline with => 'Imager';
use Inline C => <<'EOS';
void template_match(Imager::ImgRaw img, Imager::ImgRaw tmpl) {
	int x, y, tx, ty;
	i_color img_color, tmpl_color;
	// printf("img: w:%d h:%d, tmpl: w:%d, h:%d\n", img->xsize, img->ysize, tmpl->xsize, tmpl->ysize);

	Inline_Stack_Vars;
	Inline_Stack_Reset;

	for (y = 0; y < img->ysize - tmpl->ysize; y++) for (x = 0; x < img->xsize - tmpl->xsize; x++) {
		// if (img->ysize == 50 && y == 1) printf("(x:%d, y:%d)\n", x, y);
		for (ty = 0; ty < tmpl->ysize; ty++) for (tx = 0; tx < tmpl->xsize; tx++) {
			i_gpix(tmpl, tx, ty, &tmpl_color);
			i_gpix(img, x + tx, y + ty, &img_color);
			// if (img->ysize == 50 && y == 1 && x == 55) printf("t:%d\ti:%d (x:%d, y:%d)\n", tmpl_color.gray.gray_color, img_color.gray.gray_color, x, y);
			if (tmpl_color.gray.gray_color == 255) {
				if (img_color.gray.gray_color == 255) {
					continue;
				} else {
					goto next;
				}
			} else if (tmpl_color.gray.gray_color == 0) {
				if (img_color.gray.gray_color == 255) {
					goto next;
				} else {
					continue;
				}
			} else {
				continue;
			}
		}

		Inline_Stack_Push(sv_2mortal(newSViv(x)));
		Inline_Stack_Push(sv_2mortal(newSViv(y)));
		next:;
	}
	Inline_Stack_Done;
}
EOS

sub extract {
	my ($class, $image) = @_;

	my $tmpl = Imager->new;
	$tmpl->read(file => $TEMPLATE_DIR->file('attack.png'));
	my $img = Imager->new;
	$img->read(file => $image) or croak $img->errstr;
	$img = $img->convert(preset => 'grey');
	$img = $img->map(all => [ map { $_ > 127 ? 255 : 0 } (0..255)  ]);
	$DEBUG && $img->write(file => '/tmp/test.png', type => 'png') or die $img->errstr;

	my ($x, $y);
	($x, $y) = template_match($img, $tmpl);
	($x, $y) = template_match($img, $tmpl->filter(type=>"hardinvert")) unless defined $x;
	defined $x or croak "couldn't find template";
	$img = $img->crop(left => $x + 15, top => $y + 10, width => 80, height => 55);

	my $numbers = [
		map {
			my $img = Imager->new;
			$img->read(file => $TEMPLATE_DIR->file("$_.png")) or die $img->errstr;
			+{
				n => $_,
				tmpl => $img,
			};
		}
		(0 .. 9, '~', '.')
	];

	my $chars = {};
	$DEBUG && $img->write(file => '/tmp/test.png', type => 'png') or die $img->errstr;
	for my $number (@$numbers) {
		my @matched = template_match($img, $number->{tmpl});
		my $n = $number->{n};
		while (my ($x, $y) = splice @matched, 0, 2) {
			$chars->{$y}{$x} = $n;
		}
	}

	my $res = [];
	for my $y (qw/3 16 29 42/) {
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



