/*
 * Copyright (C) 2020-2021  Yomichan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const assert = require('assert');
const {testMain} = require('../dev/util');
const {VM} = require('../dev/vm');

const vm = new VM();
vm.execute([
    'js/core.js',
    'js/general/cache-map.js',
    'js/data/json-schema.js'
]);
const JsonSchemaValidator = vm.get('JsonSchemaValidator');


function testValidate1() {
    const schema = {
        allOf: [
            {
                type: 'number'
            },
            {
                anyOf: [
                    {minimum: 10, maximum: 100},
                    {minimum: -100, maximum: -10}
                ]
            },
            {
                oneOf: [
                    {multipleOf: 3},
                    {multipleOf: 5}
                ]
            },
            {
                not: [
                    {multipleOf: 20}
                ]
            }
        ]
    };

    const schemaValidate = (value) => {
        return new JsonSchemaValidator().isValid(value, schema);
    };

    const jsValidate = (value) => {
        return (
            typeof value === 'number' &&
            (
                (value >= 10 && value <= 100) ||
                (value >= -100 && value <= -10)
            ) &&
            (
                (
                    (value % 3) === 0 ||
                    (value % 5) === 0
                ) &&
                (value % 15) !== 0
            ) &&
            (value % 20) !== 0
        );
    };

    for (let i = -111; i <= 111; i++) {
        const actual = schemaValidate(i, schema);
        const expected = jsValidate(i);
        assert.strictEqual(actual, expected);
    }
}

function testValidate2() {
    const data = [
        // String tests
        {
            schema: {
                type: 'string'
            },
            inputs: [
                {expected: false, value: null},
                {expected: false, value: void 0},
                {expected: false, value: 0},
                {expected: false, value: {}},
                {expected: false, value: []},
                {expected: true,  value: ''}
            ]
        },
        {
            schema: {
                type: 'string',
                minLength: 2
            },
            inputs: [
                {expected: false, value: ''},
                {expected: false,  value: '1'},
                {expected: true,  value: '12'},
                {expected: true,  value: '123'}
            ]
        },
        {
            schema: {
                type: 'string',
                maxLength: 2
            },
            inputs: [
                {expected: true,  value: ''},
                {expected: true,  value: '1'},
                {expected: true,  value: '12'},
                {expected: false, value: '123'}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: 'test'
            },
            inputs: [
                {expected: false, value: ''},
                {expected: true,  value: 'test'},
                {expected: false, value: 'TEST'},
                {expected: true,  value: 'ABCtestDEF'},
                {expected: false, value: 'ABCTESTDEF'}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: '^test$'
            },
            inputs: [
                {expected: false, value: ''},
                {expected: true,  value: 'test'},
                {expected: false, value: 'TEST'},
                {expected: false, value: 'ABCtestDEF'},
                {expected: false, value: 'ABCTESTDEF'}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: '^test$',
                patternFlags: 'i'
            },
            inputs: [
                {expected: false, value: ''},
                {expected: true,  value: 'test'},
                {expected: true,  value: 'TEST'},
                {expected: false, value: 'ABCtestDEF'},
                {expected: false, value: 'ABCTESTDEF'}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: '*'
            },
            inputs: [
                {expected: false, value: ''}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: '.',
                patternFlags: '?'
            },
            inputs: [
                {expected: false, value: ''}
            ]
        },

        // Const tests
        {
            schema: {
                const: 32
            },
            inputs: [
                {expected: true,  value: 32},
                {expected: false, value: 0},
                {expected: false, value: '32'},
                {expected: false, value: null},
                {expected: false, value: {a: 'b'}},
                {expected: false, value: [1, 2, 3]}
            ]
        },
        {
            schema: {
                const: '32'
            },
            inputs: [
                {expected: false, value: 32},
                {expected: false, value: 0},
                {expected: true,  value: '32'},
                {expected: false, value: null},
                {expected: false, value: {a: 'b'}},
                {expected: false, value: [1, 2, 3]}
            ]
        },
        {
            schema: {
                const: null
            },
            inputs: [
                {expected: false, value: 32},
                {expected: false, value: 0},
                {expected: false, value: '32'},
                {expected: true,  value: null},
                {expected: false, value: {a: 'b'}},
                {expected: false, value: [1, 2, 3]}
            ]
        },
        {
            schema: {
                const: {a: 'b'}
            },
            inputs: [
                {expected: false, value: 32},
                {expected: false, value: 0},
                {expected: false, value: '32'},
                {expected: false, value: null},
                {expected: false, value: {a: 'b'}},
                {expected: false, value: [1, 2, 3]}
            ]
        },
        {
            schema: {
                const: [1, 2, 3]
            },
            inputs: [
                {expected: false, value: 32},
                {expected: false, value: 0},
                {expected: false,  value: '32'},
                {expected: false, value: null},
                {expected: false, value: {a: 'b'}},
                {expected: false, value: [1, 2, 3]}
            ]
        },

        // Array contains tests
        {
            schema: {
                type: 'array',
                contains: {const: 32}
            },
            inputs: [
                {expected: false, value: []},
                {expected: true,  value: [32]},
                {expected: true,  value: [1, 32]},
                {expected: true,  value: [1, 32, 1]},
                {expected: false, value: [33]},
                {expected: false, value: [1, 33]},
                {expected: false, value: [1, 33, 1]}
            ]
        },

        // Number limits tests
        {
            schema: {
                type: 'number',
                minimum: 0
            },
            inputs: [
                {expected: false, value: -1},
                {expected: true,  value: 0},
                {expected: true,  value: 1}
            ]
        },
        {
            schema: {
                type: 'number',
                exclusiveMinimum: 0
            },
            inputs: [
                {expected: false, value: -1},
                {expected: false, value: 0},
                {expected: true,  value: 1}
            ]
        },
        {
            schema: {
                type: 'number',
                maximum: 0
            },
            inputs: [
                {expected: true,  value: -1},
                {expected: true,  value: 0},
                {expected: false, value: 1}
            ]
        },
        {
            schema: {
                type: 'number',
                exclusiveMaximum: 0
            },
            inputs: [
                {expected: true,  value: -1},
                {expected: false, value: 0},
                {expected: false, value: 1}
            ]
        },

        // Integer limits tests
        {
            schema: {
                type: 'integer',
                minimum: 0
            },
            inputs: [
                {expected: false, value: -1},
                {expected: true,  value: 0},
                {expected: true,  value: 1}
            ]
        },
        {
            schema: {
                type: 'integer',
                exclusiveMinimum: 0
            },
            inputs: [
                {expected: false, value: -1},
                {expected: false, value: 0},
                {expected: true,  value: 1}
            ]
        },
        {
            schema: {
                type: 'integer',
                maximum: 0
            },
            inputs: [
                {expected: true,  value: -1},
                {expected: true,  value: 0},
                {expected: false, value: 1}
            ]
        },
        {
            schema: {
                type: 'integer',
                exclusiveMaximum: 0
            },
            inputs: [
                {expected: true,  value: -1},
                {expected: false, value: 0},
                {expected: false, value: 1}
            ]
        },
        {
            schema: {
                type: 'integer',
                multipleOf: 2
            },
            inputs: [
                {expected: true,  value: -2},
                {expected: false, value: -1},
                {expected: true,  value: 0},
                {expected: false, value: 1},
                {expected: true,  value: 2}
            ]
        },

        // Numeric type tests
        {
            schema: {
                type: 'number'
            },
            inputs: [
                {expected: true,  value: 0},
                {expected: true,  value: 0.5},
                {expected: true,  value: 1},
                {expected: false, value: '0'},
                {expected: false, value: null},
                {expected: false, value: []},
                {expected: false, value: {}}
            ]
        },
        {
            schema: {
                type: 'integer'
            },
            inputs: [
                {expected: true,  value: 0},
                {expected: false, value: 0.5},
                {expected: true,  value: 1},
                {expected: false, value: '0'},
                {expected: false, value: null},
                {expected: false, value: []},
                {expected: false, value: {}}
            ]
        }
    ];

    const schemaValidate = (value, schema) => {
        return new JsonSchemaValidator().isValid(value, schema);
    };

    for (const {schema, inputs} of data) {
        for (const {expected, value} of inputs) {
            const actual = schemaValidate(value, schema);
            assert.strictEqual(actual, expected);
        }
    }
}


function testGetValidValueOrDefault1() {
    const data = [
        // Test value defaulting on objects with additionalProperties=false
        {
            schema: {
                type: 'object',
                required: ['test'],
                properties: {
                    test: {
                        type: 'string',
                        default: 'default'
                    }
                },
                additionalProperties: false
            },
            inputs: [
                [
                    void 0,
                    {test: 'default'}
                ],
                [
                    null,
                    {test: 'default'}
                ],
                [
                    0,
                    {test: 'default'}
                ],
                [
                    '',
                    {test: 'default'}
                ],
                [
                    [],
                    {test: 'default'}
                ],
                [
                    {},
                    {test: 'default'}
                ],
                [
                    {test: 'value'},
                    {test: 'value'}
                ],
                [
                    {test2: 'value2'},
                    {test: 'default'}
                ],
                [
                    {test: 'value', test2: 'value2'},
                    {test: 'value'}
                ]
            ]
        },

        // Test value defaulting on objects with additionalProperties=true
        {
            schema: {
                type: 'object',
                required: ['test'],
                properties: {
                    test: {
                        type: 'string',
                        default: 'default'
                    }
                },
                additionalProperties: true
            },
            inputs: [
                [
                    {},
                    {test: 'default'}
                ],
                [
                    {test: 'value'},
                    {test: 'value'}
                ],
                [
                    {test2: 'value2'},
                    {test: 'default', test2: 'value2'}
                ],
                [
                    {test: 'value', test2: 'value2'},
                    {test: 'value', test2: 'value2'}
                ]
            ]
        },

        // Test value defaulting on objects with additionalProperties={schema}
        {
            schema: {
                type: 'object',
                required: ['test'],
                properties: {
                    test: {
                        type: 'string',
                        default: 'default'
                    }
                },
                additionalProperties: {
                    type: 'number',
                    default: 10
                }
            },
            inputs: [
                [
                    {},
                    {test: 'default'}
                ],
                [
                    {test: 'value'},
                    {test: 'value'}
                ],
                [
                    {test2: 'value2'},
                    {test: 'default', test2: 10}
                ],
                [
                    {test: 'value', test2: 'value2'},
                    {test: 'value', test2: 10}
                ],
                [
                    {test2: 2},
                    {test: 'default', test2: 2}
                ],
                [
                    {test: 'value', test2: 2},
                    {test: 'value', test2: 2}
                ],
                [
                    {test: 'value', test2: 2, test3: null},
                    {test: 'value', test2: 2, test3: 10}
                ],
                [
                    {test: 'value', test2: 2, test3: void 0},
                    {test: 'value', test2: 2, test3: 10}
                ]
            ]
        },

        // Test value defaulting where hasOwnProperty is false
        {
            schema: {
                type: 'object',
                required: ['test'],
                properties: {
                    test: {
                        type: 'string',
                        default: 'default'
                    }
                }
            },
            inputs: [
                [
                    {},
                    {test: 'default'}
                ],
                [
                    {test: 'value'},
                    {test: 'value'}
                ],
                [
                    Object.create({test: 'value'}),
                    {test: 'default'}
                ]
            ]
        },
        {
            schema: {
                type: 'object',
                required: ['toString'],
                properties: {
                    toString: {
                        type: 'string',
                        default: 'default'
                    }
                }
            },
            inputs: [
                [
                    {},
                    {toString: 'default'}
                ],
                [
                    {toString: 'value'},
                    {toString: 'value'}
                ],
                [
                    Object.create({toString: 'value'}),
                    {toString: 'default'}
                ]
            ]
        },

        // Test enum
        {
            schema: {
                type: 'object',
                required: ['test'],
                properties: {
                    test: {
                        type: 'string',
                        default: 'value1',
                        enum: ['value1', 'value2', 'value3']
                    }
                }
            },
            inputs: [
                [
                    {test: 'value1'},
                    {test: 'value1'}
                ],
                [
                    {test: 'value2'},
                    {test: 'value2'}
                ],
                [
                    {test: 'value3'},
                    {test: 'value3'}
                ],
                [
                    {test: 'value4'},
                    {test: 'value1'}
                ]
            ]
        },

        // Test valid vs invalid default
        {
            schema: {
                type: 'object',
                required: ['test'],
                properties: {
                    test: {
                        type: 'integer',
                        default: 2,
                        minimum: 1
                    }
                }
            },
            inputs: [
                [
                    {test: -1},
                    {test: 2}
                ]
            ]
        },
        {
            schema: {
                type: 'object',
                required: ['test'],
                properties: {
                    test: {
                        type: 'integer',
                        default: 1,
                        minimum: 2
                    }
                }
            },
            inputs: [
                [
                    {test: -1},
                    {test: -1}
                ]
            ]
        }
    ];

    for (const {schema, inputs} of data) {
        for (const [value, expected] of inputs) {
            const actual = new JsonSchemaValidator().getValidValueOrDefault(schema, value);
            vm.assert.deepStrictEqual(actual, expected);
        }
    }
}


function main() {
    testValidate1();
    testValidate2();
    testGetValidValueOrDefault1();
}


if (require.main === module) { testMain(main); }
