import Benchmark from 'benchmark'
import { LITERAL, NUMBER, OBJECT, STRING } from '../../src'
import { Meta } from '../../src/meta'

class Parent1 {
    parent1 = 1
}

class Parent2 extends Parent1 {
    parent2 = 2
}

@Meta.Class()
class MetaClassForBenchmark1 extends Parent2 {
    meta1 = 1
}

class MetaClassForBenchmark2 extends MetaClassForBenchmark1 {
    meta2 = 2
}

class ClassForBenchmark3 {
    str = STRING()
    number = NUMBER({
        default: 1
    })
    obj = OBJECT({
        a: 'string'
    })
    lit = LITERAL('1')
}

const MetaClassForBenchmark3 = Meta(ClassForBenchmark3)

const metaInstance2 = new MetaClassForBenchmark2()
const metaInstance3 = new MetaClassForBenchmark3()

const metaTypesSuite = new Benchmark.Suite('MetaType')

metaTypesSuite
    .add('new object', () => {
        Meta({})
    })
    .add('new class', () => {
        Meta({})
    })
    .add('new instance', () => {
        new MetaClassForBenchmark3()
    })
    .add('get prop value', () => {
        metaInstance2.meta2
    })
    .add('get prop value (parent)', () => {
        metaInstance2.parent1
    })
    .add('set prop value (number)', () => {
        metaInstance3.number = 1
    })
    .add('set prop value (string)', () => {
        metaInstance3.str = '1'
    })
    .add('set prop value (obj)', () => {
        metaInstance3.obj = { a: '1' }
    })
    .add('set prop value (literal)', () => {
        metaInstance3.lit = '1'
    })
    .add('set prop value (parent)', () => {
        metaInstance2.meta1 = 5
    })
    .add('serialize', () => {
        Meta.serialize(metaInstance3)
    })
    .add('deserialize', () => {
        Meta.deserialize(metaInstance3, { string: 'string' })
    })
    .add('validate', () => {
        Meta.validate(metaInstance3, { string: 'string' })
    })
    .on('cycle', (e: Benchmark.Event) => {
        console.log(`${(metaTypesSuite as any).name}: ${e.target}`)
    })
    .run()
