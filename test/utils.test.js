import {
	trimPath,
	isDocPath,
	isRawDocument,
	isDocReference,
	isColReference,
	isPositiveInteger,
	maskFromObject,
	encodeValue,
	encode,
	decode,
	objectToQuery
} from '../src/utils.js';
import Reference from '../src/Reference.js';
import GeoPoint from '../src/GeoPoint.js';
import firestoreDocument from './mockDocument.json';
import decodedDocument from './decodedMockedDocument.js';

const db = { rootPath: 'projects/projectId/databases/(default)/documents', endpoint: 'endpoint' };

test('trimPath', () => {
	expect(trimPath('/')).toEqual('');
	expect(trimPath('col')).toEqual('col');
	expect(trimPath('/col')).toEqual('col');
	expect(trimPath('/col/')).toEqual('col');
	expect(trimPath('col/')).toEqual('col');
	expect(trimPath('col  ')).toEqual('col');
	expect(trimPath('  col  ')).toEqual('col');
	expect(trimPath('  col')).toEqual('col');

	expect(trimPath('col/doc')).toEqual('col/doc');
	expect(trimPath('/col/doc')).toEqual('col/doc');
	expect(trimPath('/col/doc/')).toEqual('col/doc');
	expect(trimPath('col/doc/')).toEqual('col/doc');
	expect(trimPath('col/doc  ')).toEqual('col/doc');
	expect(trimPath('  col/doc  ')).toEqual('col/doc');
	expect(trimPath('  col/doc')).toEqual('col/doc');
});

test('IsDocPath', () => {
	expect(isDocPath('')).toEqual(false);
	expect(isDocPath('col')).toEqual(false);
	expect(isDocPath('col/doc/col')).toEqual(false);
	expect(isDocPath('col/doc/col/doc/col')).toEqual(false);

	expect(isDocPath('col/doc')).toEqual(true);
	expect(isDocPath('col/doc/col/doc')).toEqual(true);
	expect(isDocPath('col/doc/col/doc/col/doc')).toEqual(true);
});

describe('isRawDocument', () => {
	test('Returns false when object is not a firebase doc', () => {
		expect(
			isRawDocument({
				hi: 'there!'
			})
		).toEqual(false);

		expect(
			isRawDocument({
				name: 'testing'
			})
		).toEqual(false);

		expect(isRawDocument(new Date())).toEqual(false);
		expect(isRawDocument([])).toEqual(false);
		expect(isRawDocument('string')).toEqual(false);
		expect(isRawDocument(123)).toEqual(false);
	});

	test('Returns true when the object has the required props', () => {
		expect(
			isRawDocument({
				name: 'test',
				createTime: 'test',
				updateTime: 'test'
			})
		).toEqual(true);

		expect(
			isRawDocument({
				name: 'test',
				fields: '',
				createTime: 'test',
				updateTime: 'test'
			})
		).toEqual(true);
	});
});

test('IsDocReference', () => {
	// random types.
	expect(isDocReference(123)).toEqual(false);
	expect(isDocReference("I'm a reference!!!")).toEqual(false);
	expect(isDocReference({ reference: '???' })).toEqual(false);
	expect(isDocReference([])).toEqual(false);

	// References to collections
	expect(isDocReference(new Reference('col', db))).toEqual(false);
	expect(isDocReference(new Reference('col/doc/col', db))).toEqual(false);

	// References to documents.
	expect(isDocReference(new Reference('col/doc', db))).toEqual(true);
	expect(isDocReference(new Reference('col/doc/col/doc', db))).toEqual(true);
});

test('IsColReference', () => {
	// random types.
	expect(isColReference(123)).toEqual(false);
	expect(isColReference("I'm a reference!!!")).toEqual(false);
	expect(isColReference({ reference: '???' })).toEqual(false);
	expect(isColReference([])).toEqual(false);

	// References to collections
	expect(isColReference(new Reference('col', db))).toEqual(true);
	expect(isColReference(new Reference('col/doc/col', db))).toEqual(true);
	expect(isColReference(new Reference('col/doc/col/doc/col', db))).toEqual(true);

	// References to documents.
	expect(isColReference(new Reference('col/doc', db))).toEqual(false);
	expect(isColReference(new Reference('col/doc/col/doc', db))).toEqual(false);
	expect(isColReference(new Reference('col/doc/col/doc/col/doc', db))).toEqual(false);
});

test('IsPositiveInteger', () => {
	expect(isPositiveInteger(-1)).toEqual(false);
	expect(isPositiveInteger(-1.1)).toEqual(false);
	expect(isPositiveInteger(1.1)).toEqual(false);
	expect(isPositiveInteger(4.2)).toEqual(false);
	expect(isPositiveInteger(11111.001)).toEqual(false);

	// Valid
	expect(isPositiveInteger(1)).toEqual(true);
	expect(isPositiveInteger(42)).toEqual(true);
	expect(isPositiveInteger(1000000)).toEqual(true);
});

describe('ObjectToQuery', () => {
	test('Normal properties and arrays', () => {
		expect(
			objectToQuery({
				one: 'one',
				two: 'two',
				three: 'three',
				array: ['one', 'two', 'three']
			})
		).toEqual('?one=one&two=two&three=three&array=one,two,three');
	});

	test('Ignores undefined', () => {
		expect(
			objectToQuery({
				one: 'one',
				two: undefined,
				three: 'three',
				array: ['one', 'two', 'three']
			})
		).toEqual('?one=one&three=three&array=one,two,three');
	});
});

describe('maskFromObject', () => {
	test('Empty object', () => {
		const obj = {};
		const expected = '';

		expect(maskFromObject(obj)).toEqual(expected);
	});

	test('Shallow object', () => {
		const obj = {
			one: 'one',
			two: 'two',
			three: 'three',
			four: 'four'
		};
		const expected =
			'updateMask.fieldPaths=one&updateMask.fieldPaths=two&updateMask.fieldPaths=three&updateMask.fieldPaths=four';

		expect(maskFromObject(obj)).toEqual(expected);
	});

	test('Nested object', () => {
		const obj = {
			one: 'one',
			two: {
				one: 'one',
				two: 'two'
			},
			three: {
				one: {
					one: 'one'
				}
			}
		};
		const expected =
			'updateMask.fieldPaths=one&updateMask.fieldPaths=two.one&updateMask.fieldPaths=two.two&updateMask.fieldPaths=three.one.one';

		expect(maskFromObject(obj)).toEqual(expected);
	});

	test('Arrays', () => {
		const obj = {
			one: ['one'],
			two: {
				one: 'one',
				two: []
			}
		};
		const expected = 'updateMask.fieldPaths=one&updateMask.fieldPaths=two.one&updateMask.fieldPaths=two.two';

		expect(maskFromObject(obj)).toEqual(expected);
	});
});

describe('Decode', () => {
	test('Throw when database argument is missing', () => {
		expect(() => decode(firestoreDocument)).toThrow();
	});

	test('All types are converted correctly', () => {
		expect(decode(firestoreDocument, db)).toEqual(decodedDocument);
	});

	test('Invalid types throw', () => {
		const badValue = {
			fields: {
				bad: {
					badValue: 'this value does not exist'
				}
			}
		};

		expect(() => {
			decode(badValue, db);
		}).toThrow('Invalid Firestore value_type "badValue"');
	});
});

describe('EncodeValue', () => {
	test('Null', () => {
		expect(encodeValue(null)).toEqual({ nullValue: null });
	});

	test('Booleans', () => {
		expect(encodeValue(true)).toEqual({ booleanValue: true });
		expect(encodeValue(false)).toEqual({ booleanValue: false });
	});

	test('Integers', () => {
		expect(encodeValue(42)).toEqual({ integerValue: '42' });
	});

	test('Doubles', () => {
		expect(encodeValue(4.2)).toEqual({ doubleValue: '4.2' });
	});

	test('Dates', () => {
		const date = new Date();
		expect(encodeValue(date)).toEqual({ timestampValue: date.toISOString() });
	});

	test('String', () => {
		expect(encodeValue('This is a string')).toEqual({ stringValue: 'This is a string' });
	});

	test('References', () => {
		expect(encodeValue(new Reference('col/doc', db))).toEqual({
			referenceValue: 'projects/projectId/databases/(default)/documents/col/doc'
		});
	});

	test('GeoPoints', () => {
		expect(encodeValue(new GeoPoint(30, 30))).toEqual({
			geoPointValue: {
				latitude: 30,
				longitude: 30
			}
		});
	});

	test('Arrays', () => {
		const date = new Date();

		expect(encodeValue([null, false, 42, 4.2, date, 'string'])).toEqual({
			arrayValue: {
				values: [
					{
						nullValue: null
					},
					{
						booleanValue: false
					},
					{
						integerValue: '42'
					},
					{
						doubleValue: '4.2'
					},
					{
						timestampValue: date.toISOString()
					},
					{
						stringValue: 'string'
					}
				]
			}
		});
	});

	test('Objects', () => {
		expect(encode(decodedDocument)).toEqual({
			fields: firestoreDocument.fields
		});
	});
});
