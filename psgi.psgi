#!plackup
package Mabinogi::Service::WWW;

use lib 'extractor/lib';

use Plack::Request;
use Data::Section::Simple qw(get_data_section);
use Mabinogi::Extractor::Attack;

my $app = sub {
	my $req = Plack::Request->new(shift);
	my $res = $req->new_response(200);
	$res->content_type('text/html; charset=utf-8');

	my $h = +{
		'/' => sub {
			$res->content(get_data_section('index.html'));
		},
		'/extract' => sub {
			my $img = $req->upload('image');
			if ($img->size > 500 * 1024 * 1024) {
				$res->status(413);
				$res->content('Request Entity Too Large');
				return;
			}
			my $results = Mabinogi::Extractor::Attack->extract($img->path);
			if ($results) {
				for my $key (keys %$results) {
					$res->cookies->{$key} = $results->{$key};
					$res->redirect('/');
				}
			} else {
			}
		},
	}->{$req->path};

	if ($h) {
		$h->();
	} else {
		$res->status(404);
	}

	$res->finalize;
};

use Plack::Builder;

builder {
	enable "Plack::Middleware::Static",
		path => qr{^/(images|js|css|static)/}, root => '.';

	$app;
};

__DATA__
@@ index.html
<!DOCTYPE html>
<html>
	<head>
		<title></title>
	</head>
	<body>
		<form action="/extract" method="post" enctype="multipart/form-data">
			<div>
				<input type="file" name="image"/>
				<input type="submit" value="抽出"/>
			</div>
		</form>
	</body>
</html>

