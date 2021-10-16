(function() {
  'use strict';
  var CND, Dba, PATH, SQL, badge, create_db_structure, create_dba, debug, demo_populate_db, demo_show_select_names, echo, format, guy, help, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ALL-THE-PACKAGE-NAMES';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  PATH = require('path');

  types = new (require('intertype')).Intertype();

  ({isa, type_of, validate, validate_list_of} = types.export());

  SQL = String.raw;

  guy = require('guy');

  ({Dba} = require('icql-dba'));

  ({format} = new Intl.NumberFormat());

  //-----------------------------------------------------------------------------------------------------------
  create_dba = function() {
    var db_filename, dba, path, prefix, regex_cache, schema;
    db_filename = 'npm-names.sqlite';
    path = PATH.resolve(__dirname, '..', db_filename);
    schema = 'main';
    dba = new Dba();
    dba.open({schema, path});
    dba.create_stdlib();
    //.........................................................................................................
    prefix = 'std_';
    regex_cache = {};
    dba.create_function({
      name: prefix + 're_is_match',
      deterministic: true,
      varargs: false,
      call: function(text, pattern) {
        var regex;
        regex = (regex_cache[pattern] != null ? regex_cache[pattern] : regex_cache[pattern] = new RegExp(pattern, 'g'));
        // debug '^44443^', text, regex, ( text.match regex )
        if ((text.match(regex)) != null) {
          return 1;
        } else {
          return 0;
        }
      }
    });
    // debug '^330^', [ ( dba.query "select std_re_is_match( 'foobar', '(.)\\1\\1' )" )..., ]
    // debug '^330^', [ ( dba.query "select std_re_is_match( 'fobar', '(.)\\1\\1' )" )..., ]
    // debug '^343^',  'foobar'.match new RegExp '(.)\\1\\1'
    // debug '^343^',  'fobar'.match new RegExp '(.)\\1\\1'
    // debug '^343^',  'foobar'.match new RegExp /(.)\1\1/
    // debug '^343^',  'fobar'.match new RegExp /(.)\1\1/
    //.........................................................................................................
    dba.create_function({
      name: 'str_3_same_letters',
      deterministic: true,
      varargs: false,
      call: function(text) {
        if ((new Set(text)).size === 1) {
          return 1;
        } else {
          return 0;
        }
      }
    });
    debug('^330^', [...(dba.query(SQL`select str_3_same_letters( 'aaa' );`))]);
    debug('^330^', [...(dba.query(SQL`select str_3_same_letters( 'aab' );`))]);
    return {path, dba, schema};
  };

  //-----------------------------------------------------------------------------------------------------------
  create_db_structure = function(dba) {
    var count, insert, letters;
    dba.execute(SQL`create table if not exists names (
  name    text unique not null primary key,
  length  integer generated always as ( length( name ) ) virtual not null );
create index if not exists names_length_idx on names ( length );
create table if not exists short_names (
  name    text unique not null primary key,
  length  integer not null );`);
    letters = 'abcdefghijklmnopqrstuvwxyz';
    insert = dba.prepare(SQL`insert into short_names ( name, length ) values ( $name, $length ) on conflict do nothing;`);
    count = 0;
    dba.with_transaction(function() {
      var i, j, k, l, l1, l2, l3, l4, len, len1, len2, len3, name2, name3;
      for (i = 0, len = letters.length; i < len; i++) {
        l1 = letters[i];
        for (j = 0, len1 = letters.length; j < len1; j++) {
          l2 = letters[j];
          count++;
          name2 = l1 + l2;
          insert.run({
            name: name2,
            length: 2
          });
          for (k = 0, len2 = letters.length; k < len2; k++) {
            l3 = letters[k];
            count++;
            name3 = name2 + l3;
            insert.run({
              name: name3,
              length: 3
            });
            for (l = 0, len3 = letters.length; l < len3; l++) {
              l4 = letters[l];
              count++;
              insert.run({
                name: name3 + l4,
                length: 4
              });
            }
          }
        }
      }
      return null;
    });
    info(`generated ${format(count)} two-, three- and four-letter NPM names`);
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  demo_populate_db = function() {
    var count, dba, insert, names, path;
    ({dba, path} = create_dba());
    names = require('../names.json');
    create_db_structure(dba);
    info(`read ${format(names.length)} NPM names`);
    insert = dba.prepare(SQL`insert into names ( name ) values ( $name ) on conflict do nothing;`);
    count = 0;
    dba.with_transaction(function() {
      var i, len, name, results;
      results = [];
      for (i = 0, len = names.length; i < len; i++) {
        name = names[i];
        if (count % 1e5 === 0) {
          whisper(format(count));
        }
        count++;
        // return null if count > 3e4
        // debug '^5580^', name
        results.push(insert.run({name}));
      }
      return results;
    });
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  demo_show_select_names = function() {
    var Dcat, Tbl, dba, dtab, path;
    ({dba, path} = create_dba());
    ({Tbl} = require('icql-dba-tabulate'));
    ({Dcat} = require('icql-dba-catalog'));
    dtab = new Tbl({dba});
    // dcat        = new Dcat  { dba, }
    help("names");
    echo(dtab._tabulate(dba.query(SQL`select * from names limit 10;`)));
    help("names");
    echo(dtab._tabulate(dba.query(SQL`select
    *
  from short_names as n3
  where not exists (
    select 1
      from names as n
      where n.name = n3.name )
  order by n3.name
  limit 1000;`)));
    help("four_letter_names");
    echo(dtab._tabulate(dba.query(SQL`select
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
  limit 100000;`)));
    // help "names";     echo dtab._tabulate dba.query SQL"""
    //   select
    //       *
    //     from names as n
    //     where true
    //       and std_re_is_match( n.name, 'db' )
    //     order by n.name;"""
    // help "names";     echo dtab._tabulate dba.query SQL"""
    //   select
    //       *
    //     from three_letter_names as n3
    //     where str_3_same_letters( n3.name )
    //     order by n3.name
    //     limit 20;"""
    return null;
  };

  //###########################################################################################################
  if (module === require.main) {
    (() => {
      // demo_populate_db()
      return demo_show_select_names();
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map