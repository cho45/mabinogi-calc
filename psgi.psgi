#!plackup
# vim:set ft=perl:
use Plack::Builder;
use Plack::App::WrapCGI;
use Plack::App::Directory;
use IO::Handle;

builder {
	mount '/extract.cgi'
		=> Plack::App::WrapCGI->new(script => "extract.cgi")->to_app;
	mount '/'
		=> Plack::App::Directory->new({ root => "." })->to_app;
};
