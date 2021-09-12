(function() {
  'use strict';
  var CND, Dba, PATH, SQL, badge, create_db_structure, debug, demo, echo, format, guy, help, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

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
  demo = function() {
    var count, db_filename, dba, insert, names, path, schema;
    db_filename = 'npm-names.sqlite';
    path = PATH.resolve(__dirname, '..', db_filename);
    schema = 'main';
    dba = new Dba();
    dba.open({schema, path});
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
  create_db_structure = function(dba) {
    var count, insert, letters;
    dba.execute(SQL`create table if not exists names (
  name    text unique not null primary key,
  length  integer generated always as ( length( name ) ) virtual not null );
create index if not exists names_length_idx on names ( length );
create table if not exists three_letter_names (
  name    text unique not null primary key,
  length  integer not null default 3 );`);
    letters = 'abcdefghijklmnopqrstuvwxyz';
    insert = dba.prepare(SQL`insert into three_letter_names ( name ) values ( $name ) on conflict do nothing;`);
    count = 0;
    dba.with_transaction(function() {
      var i, j, k, l1, l2, l3, len, len1, len2;
      for (i = 0, len = letters.length; i < len; i++) {
        l1 = letters[i];
        for (j = 0, len1 = letters.length; j < len1; j++) {
          l2 = letters[j];
          for (k = 0, len2 = letters.length; k < len2; k++) {
            l3 = letters[k];
            count++;
            insert.run({
              name: l1 + l2 + l3
            });
          }
        }
      }
      return null;
    });
    info(`generated ${format(count)} three-letter NPM names`);
    return null;
  };

  //###########################################################################################################
  if (module === require.main) {
    (() => {
      return demo();
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map