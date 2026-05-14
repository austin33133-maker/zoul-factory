#!/usr/bin/env python3
"""
More aggressive JS sample generator that hits historically interesting
Hermes surfaces: BigInt, Proxy + getter side effects, RegExp edge cases,
huge string/array allocation, Array.prototype.apply with large argc,
TypedArray boundary indexing, recursive Proxy, prototype mutation in
hot path. Each template is deliberately small but exercises one corner.
"""
from __future__ import annotations
import argparse, random, sys
from pathlib import Path

TEMPLATES = [
    # Proxy invalidating hidden class mid-loop
    """var o={a:1,b:2,c:3};
       var p=new Proxy(o,{get(t,k){if(k==='c'){delete t.a;}return t[k];});
       var s=0;for(var i=0;i<{N};i++){s+=(p.a|0)+(p.b|0)+(p.c|0);}
       print(s);""",
    # Array.prototype.apply with huge argc (CVE-2020-1896 family)
    """var n={N};var arr=Array(n).fill(1);
       function f(){return arguments.length;}
       print(f.apply(null,arr));""",
    # RegExp catastrophic backtracking + Unicode
    """try{var r=new RegExp('(a+)+b');print(r.test('a'.repeat({N})+'c'));}
       catch(e){print(String(e).slice(0,40));}""",
    # String.fromCharCode + repeat producing huge string
    """var s='';try{s=String.fromCharCode(0x4f60,0x597d).repeat({N});}
       catch(e){};print(s.length);""",
    # Sparse array hole vs undefined semantics
    """var a=new Array({N});a[0]=1;a[{N}-1]=2;
       var s=0;a.forEach(function(x){s+=x|0;});print(s,a.length);""",
    # BigInt around 64-bit boundary
    """try{var x=BigInt('{HEX}');print(String(x|BigInt(0)).length);}
       catch(e){print('e');}""",
    # Object.defineProperty getter that mutates prototype
    """var o={};Object.defineProperty(o,'x',{get(){Object.setPrototypeOf(this,null);return 42;}});
       print(o.x,Object.getPrototypeOf(o));""",
    # JSON parse pathological depth
    """var s='['.repeat({N})+']'.repeat({N});
       try{JSON.parse(s);print('ok');}catch(e){print('e');}""",
    # WeakRef + finalizer reentrancy
    """if(typeof WeakRef!=='undefined'){
         var t={};var w=new WeakRef(t);t=null;
         for(var i=0;i<{N};i++){Array(8).fill(i);}
         print(typeof w.deref());
       }else{print('nows');}""",
    # TypedArray with detached buffer access
    """var ab=new ArrayBuffer({N});var u=new Uint8Array(ab);
       try{ab.transfer?ab.transfer():null;u[0]=1;print(u[0]);}
       catch(e){print('e');}""",
    # Function.prototype.toString with weird names
    """function \\u{1f600}(){return 1;}
       print(eval(String.fromCharCode(0xd83d,0xde00)+'()'));""",
    # Array.from with proxied iterable
    """var p=new Proxy({0:1,1:2,length:{N}},{});
       print(Array.from(p).length);""",
    # Sort comparator mutating array
    """var a=[];for(var i=0;i<{N};i++)a.push(i);
       a.sort(function(x,y){a.length=1;return x-y;});print(a.length);""",
    # eval inside frozen object
    """var o=Object.freeze({x:1});try{o.x=2;}catch(e){}
       print(o.x);""",
    # Date with extreme values
    """print(new Date({BIGINT}).toISOString().slice(0,10));""",
    # Map/Set with NaN keys
    """var m=new Map();m.set(NaN,1);m.set(NaN,2);print(m.size,m.get(NaN));""",
    # String.prototype.normalize on lone surrogate
    """try{print('\\ud83d'.normalize().length);}catch(e){print('e');}""",
    # Re-entrant getter on array length
    """var a=[1,2,3];
       Object.defineProperty(a,'length',{get(){return 0;}});
       print(a.length,a[0]);""",
    # Proxy with no-op get trap on arguments
    """function f(){var p=new Proxy(arguments,{get(t,k){return t[k];}});
       return p.length+(p[0]|0);}print(f(7,8,9));""",
    # Spread of huge sequence into function call
    """function f(){return arguments.length;}
       try{print(f(...Array({N}).keys()));}catch(e){print('e');}""",
]

EXPRS = ["1", "0", "100", "65535", "1000", "10000", "100000"]
BIGINTS = ["8640000000000000", "-8640000000000000", "1e20", "1e15"]
HEXS = ["0xffffffffffffffff", "0x7fffffffffffffff", "0x10000000000000000", "0xdeadbeefcafebabe"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("n", type=int)
    ap.add_argument("out")
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    for i in range(args.n):
        t = random.choice(TEMPLATES)
        js = (t
              .replace("{N}", random.choice(EXPRS))
              .replace("{BIGINT}", random.choice(BIGINTS))
              .replace("{HEX}", random.choice(HEXS)))
        (out / f"agg_{i:05d}.js").write_text(js)
    print(f"wrote {args.n} aggressive cases to {out}")


if __name__ == "__main__":
    sys.exit(main())
