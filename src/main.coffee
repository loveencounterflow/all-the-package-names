
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ALL-THE-PACKAGE-NAMES'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
PATH                      = require 'path'
types                     = new ( require 'intertype' ).Intertype
{ isa
  type_of
  validate
  validate_list_of }      = types.export()
SQL                       = String.raw
guy                       = require 'guy'
{ Dba }                   = require 'icql-dba'
{ format }                = new Intl.NumberFormat()


#-----------------------------------------------------------------------------------------------------------
create_dba = ->
  db_filename = 'npm-names.sqlite'
  path        = PATH.resolve __dirname, '..', db_filename
  schema      = 'main'
  dba         = new Dba()
  dba.open { schema, path, }
  dba.create_stdlib()
  #.........................................................................................................
  prefix      = 'std_'
  regex_cache = {}
  dba.create_function
    name:           prefix + 're_is_match'
    deterministic:  true
    varargs:        false
    call:           ( text, pattern ) ->
      regex = ( regex_cache[ pattern ] ?= new RegExp pattern, 'g' )
      # debug '^44443^', text, regex, ( text.match regex )
      return if ( text.match regex )? then 1 else 0
  # debug '^330^', [ ( dba.query "select std_re_is_match( 'foobar', '(.)\\1\\1' )" )..., ]
  # debug '^330^', [ ( dba.query "select std_re_is_match( 'fobar', '(.)\\1\\1' )" )..., ]
  # debug '^343^',  'foobar'.match new RegExp '(.)\\1\\1'
  # debug '^343^',  'fobar'.match new RegExp '(.)\\1\\1'
  # debug '^343^',  'foobar'.match new RegExp /(.)\1\1/
  # debug '^343^',  'fobar'.match new RegExp /(.)\1\1/
  #.........................................................................................................
  dba.create_function
    name:           'str_3_same_letters'
    deterministic:  true
    varargs:        false
    call:           ( text ) ->
      return if ( new Set text ).size is 1 then 1 else 0
  debug '^330^', [ ( dba.query SQL"select str_3_same_letters( 'aaa' );" )..., ]
  debug '^330^', [ ( dba.query SQL"select str_3_same_letters( 'aab' );" )..., ]
  return { path, dba, schema, }

#-----------------------------------------------------------------------------------------------------------
create_db_structure = ( dba ) ->
  dba.execute SQL"""
    create table if not exists names (
      name    text unique not null primary key,
      length  integer generated always as ( length( name ) ) virtual not null );
    create index if not exists names_length_idx on names ( length );
    create table if not exists short_names (
      name    text unique not null primary key,
      length  integer not null );
    """
  letters     = 'abcdefghijklmnopqrstuvwxyz'
  insert      = dba.prepare SQL"insert into short_names ( name, length ) values ( $name, $length ) on conflict do nothing;"
  count       = 0
  dba.with_transaction ->
    for l1 in letters
      for l2 in letters
        count++
        name2 = ( l1 + l2 )
        insert.run { name: name2, length: 2, }
        for l3 in letters
          count++
          name3 = name2 + l3
          insert.run { name: name3, length: 3 }
          for l4 in letters
            count++
            insert.run { name: ( name3 + l4 ), length: 4, }
    return null
  info "generated #{format count} two-, three- and four-letter NPM names"
  return null

#-----------------------------------------------------------------------------------------------------------
demo_populate_db = ->
  { dba
    path }    = create_dba()
  names       = require '../names.json'
  create_db_structure dba
  info "read #{format names.length} NPM names"
  insert      = dba.prepare SQL"insert into names ( name ) values ( $name ) on conflict do nothing;"
  count       = 0
  dba.with_transaction ->
    for name in names
      whisper format count if count % 1e5 is 0
      count++
      # return null if count > 3e4
      # debug '^5580^', name
      insert.run { name, }
  return null

#-----------------------------------------------------------------------------------------------------------
demo_show_select_names = ->
  { dba
    path }    = create_dba()
  { Tbl }     = require 'icql-dba-tabulate'
  { Dcat, }   = require 'icql-dba-catalog'
  dtab        = new Tbl   { dba, }
  # dcat        = new Dcat  { dba, }
  help "names";     echo dtab._tabulate dba.query SQL"select * from names limit 10;"
  help "names";     echo dtab._tabulate dba.query SQL"""
    select
        *
      from short_names as n3
      where not exists (
        select 1
          from names as n
          where n.name = n3.name )
      order by n3.name
      limit 1000;"""
  help "four_letter_names";     echo dtab._tabulate dba.query SQL"""
    select
        *
      from short_names as nn
      where true
        and ( std_re_is_match( nn.name, '^d' ) ) -- or ( std_re_is_match( nn.name, 'daba' ) )
        and not exists (
          select 1
            from names as n
            where true
              and n.name = nn.name )
      order by nn.name
      limit 100000;"""
  # help "names";     echo dtab._tabulate dba.query SQL"""
  #   select
  #       *
  #     from names as n
  #     where true
  #       and std_re_is_match( n.name, 'db' )
  #     order by n.name;"""
  # help "names";     echo dtab._tabulate dba.query SQL"""
  #   select
  #       *
  #     from three_letter_names as n3
  #     where str_3_same_letters( n3.name )
  #     order by n3.name
  #     limit 20;"""
  return null

############################################################################################################
if module is require.main then do =>
  # demo_populate_db()
  demo_show_select_names()


