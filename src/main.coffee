
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
demo = ->
  db_filename = 'npm-names.sqlite'
  path        = PATH.resolve __dirname, '..', db_filename
  schema      = 'main'
  dba         = new Dba()
  dba.open { schema, path, }
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
create_db_structure = ( dba ) ->
  dba.execute SQL"""
    create table if not exists names (
      name    text unique not null primary key,
      length  integer generated always as ( length( name ) ) virtual not null );
    create index if not exists names_length_idx on names ( length );
    create table if not exists three_letter_names (
      name    text unique not null primary key,
      length  integer not null default 3 );
    """
  letters     = 'abcdefghijklmnopqrstuvwxyz'
  insert      = dba.prepare SQL"insert into three_letter_names ( name ) values ( $name ) on conflict do nothing;"
  count       = 0
  dba.with_transaction ->
    for l1 in letters
      for l2 in letters
        for l3 in letters
          count++
          insert.run { name: ( l1 + l2 + l3 ), }
    return null
  info "generated #{format count} three-letter NPM names"
  return null


############################################################################################################
if module is require.main then do =>
  demo()
