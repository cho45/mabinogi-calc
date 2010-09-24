#!perl
use strict;
use warnings;

use Test::Most;
use Mabinogi::Extractor::Attack;

subtest "t/data/mabinogi_2009_10_01_005.jpg" => sub {
	my $result = Mabinogi::Extractor::Attack->extract('t/data/mabinogi_2009_10_01_005.jpg');
	is $result->{damage}, '21~78';
	is $result->{wound}, '15.0~32.0';
	is $result->{critical}, '36.8';
	is $result->{balance}, '80';
	done_testing;
};

subtest "t/data/mabinogi_2010_06_12_001.jpg" => sub {
	my $result = Mabinogi::Extractor::Attack->extract('t/data/mabinogi_2010_06_12_001.jpg');
	is $result->{damage}, '99~233';
	is $result->{wound}, '18.0~100.0';
	is $result->{critical}, '8.3';
	is $result->{balance}, '80';
	done_testing;
};

subtest "t/data/mabinogi_2010_06_13_001.jpg" => sub {
	my $result = Mabinogi::Extractor::Attack->extract('t/data/mabinogi_2010_06_13_001.jpg');
	is $result->{damage}, '110~255';
	is $result->{wound}, '20.0~100.0';
	is $result->{critical}, '10.1';
	is $result->{balance}, '80';
	done_testing;
};

done_testing;
