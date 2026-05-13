// libFuzzer harness for the Hermes HBC bytecode deserializer.
//
// The deserializer takes attacker-controllable bytes (an .hbc blob) and
// constructs in-memory function tables, string tables, big-int tables,
// regex tables, debug info, etc. Historically a productive attack
// surface: out-of-bounds reads on truncated tables, signed/unsigned
// confusion on offsets, mismatched header/version fields.
//
// Build (after running scripts/setup-hermes-research.sh):
//
//   clang++ -std=c++17 -g -O1 \
//     -fsanitize=fuzzer,address,undefined \
//     -I$HERMES_SRC/include -I$HERMES_SRC/external \
//     harness/hbc_fuzz.cc \
//     $HERMES_BUILD/lib/libhermesvm.a \
//     -o hbc_fuzz
//
//   ./hbc_fuzz -max_len=65536 corpus/
//
// The exact include/lib names may drift across Hermes versions; check
// $HERMES_BUILD/lib for the actual static libs and adjust.

#include <cstddef>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "hermes/BCGen/HBC/BytecodeDataProvider.h"
#include "hermes/Public/Buffer.h"

namespace {

class VectorBuffer final : public hermes::Buffer {
 public:
  VectorBuffer(const uint8_t *data, size_t size) {
    data_ = data;
    size_ = size;
  }
};

}  // namespace

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
  // The HBC header is ~128 bytes; nothing useful smaller than that.
  if (size < 128) return 0;

  // BytecodeDataProvider validates the header magic / version / table
  // bounds. Most parser CVEs in Hermes' history were inside this
  // validation, so we deliberately exercise it on raw bytes.
  auto buf = std::make_unique<VectorBuffer>(data, size);
  std::string errmsg;
  auto result =
      hermes::hbc::BCProviderFromBuffer::createBCProviderFromBuffer(
          std::move(buf), &errmsg);

  // We don't care if it returns nullptr — we care if it ASAN-crashes.
  (void)result;
  (void)errmsg;
  return 0;
}

// Optional: seed the corpus by mutating a real compiled module.
//
//   $HERMESC_BIN -emit-binary -out=seed.hbc seed.js
//   mkdir -p corpus && cp seed.hbc corpus/
//
// Then run with `-dict=hbc.dict` if you have a dictionary of magic bytes
// (0xC61FBC03 header magic, version bytes, common opcodes).
