'use strict';

const Lf = require('lovefield');

const Track = require('./track.js');

exports.openDb = function openDb(userId, callback) {
  console.log('opening...');
  const schemaBuilder = Lf.schema.create('ltracks_' + userId, 1);

  let table = schemaBuilder.createTable('Track');

  Track.fields.forEach(field => {
    table = table.addColumn(field.name, field.type);

    if (field.name === 'id') {
      table = table.addPrimaryKey(['id']);
    } else {
      table = table.addNullable([field.name]);
      table = table.addIndex('idx_' + field.name, [field.name], false, Lf.Order.DESC);
    }
  });

  schemaBuilder.connect({storeType: Lf.schema.DataStoreType.MEMORY}).
    then(callback).catch(console.error);
};

exports.upsertTracks = function upsertTracks(db, userId, tracks, callback) {
  const track = db.getSchema().table('Track');

  const rows = [];
  for (let i = 0; i < tracks.length; i++) {
    rows.push(track.createRow(tracks[i]));
  }

  return db.insertOrReplace().into(track).values(rows).exec().
    then(callback).
    catch(console.error);
};

exports.deleteTracks = function deleteTracks(db, userId, trackIds, callback) {
  const track = db.getSchema().table('Track');
  db.delete().from(track).where(track.id.in(trackIds)).exec().
    then(callback).
    catch(console.error);
};

function buildClause(track, rule) {
  let clause = null;

  if ('any' in rule) {
    clause = Lf.op.or.apply(Lf.op, rule.any.map(buildClause.bind(undefined, track)));
  } else if ('all' in rule) {
    clause = Lf.op.and.apply(Lf.op, rule.all.map(buildClause.bind(undefined, track)));
  } else {
    clause = track[rule.name][rule.operator](rule.value);
  }

  return clause;
}

exports.queryTracks = function queryTracks(db, userId, playlistDefinition, callback) {
  const track = db.getSchema().table('Track');

  const clause = buildClause(track, playlistDefinition);
  db.select().from(track).where(clause).exec().
    then(callback).
    catch(console.error);
};
