#!/usr/bin/env perl
# vim:set ft=perl:
package Mabinogi::Service::Extractor;

use lib 'extractor/lib';

use Plack::Request;
use Data::Section::Simple qw(get_data_section);
use Mabinogi::Extractor::Attack;
use JSON::XS;
use UNIVERSAL::require;

my $app = sub {
	my $req = Plack::Request->new(shift);
	my $res = $req->new_response(200);
	$res->content_type('text/html; charset=utf-8');

	my $img = $req->upload('image');
	if ($img) {
		if ($img->size > 500 * 1024 * 1024) {
			$res->status(413);
			$res->content('Request Entity Too Large');
			return;
		}
		my $results = Mabinogi::Extractor::Attack->extract($img->path);
		if ($results) {
			my $content = '<textarea>(' . encode_json($results) . ')</textarea>';
			$res->content($content);
		} else {
			$res->status(500);
			$res->content('failed to extract');
		}
	} else {
		$res->status(500);
		$res->content('require image parameter');
	}

	$res->finalize;
};

if ($ENV{GATEWAY_INTERFACE}) {
	Plack::Handler::CGI->use;
	Plack::Handler::CGI->new->run($app);
}

