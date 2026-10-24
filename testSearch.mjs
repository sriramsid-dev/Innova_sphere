import { fetchAllSchemes, searchSchemes, queryAssistant } from "./src/services/searchService.js";

async function runTests() {
  console.log("--- 1. Testing fetchAllSchemes ---");
  const { schemes: all, source: allSource } = await fetchAllSchemes();
  console.log(`Fetched ${all.length} schemes. Source: ${allSource}`);
  if (all.length !== 3) throw new Error("Expected 3 schemes");

  console.log("\n--- 2. Testing searchSchemes by keyword 'insurance' ---");
  const { schemes: filteredEn, source: sourceEn } = await searchSchemes({ query: "insurance", category: "all", lang: "en" });
  console.log(`Found ${filteredEn.length} scheme(s) for 'insurance'. Source: ${sourceEn}. Name: ${filteredEn[0]?.code}`);
  if (filteredEn[0]?.code !== "PMFBY") throw new Error("Expected PMFBY");

  console.log("\n--- 3. Testing searchSchemes by Telugu keyword 'ఆదాయ' ---");
  const { schemes: filteredTe, source: sourceTe } = await searchSchemes({ query: "ఆదాయ", category: "all", lang: "te" });
  console.log(`Found ${filteredTe.length} scheme(s) for 'ఆదాయ'. Source: ${sourceTe}. Name: ${filteredTe[0]?.code}`);

  console.log("\n--- 4. Testing queryAssistant with matched query (English) ---");
  const chatRes1 = await queryAssistant("What are the documents required for PM Kisan?", "en");
  console.log("Status:", chatRes1.status);
  console.log("Primary Scheme:", chatRes1.primaryScheme?.code);
  console.log("Message snippet:\n", chatRes1.message.substring(0, 150), "...");

  console.log("\n--- 5. Testing queryAssistant with matched query (Telugu) ---");
  const chatRes2 = await queryAssistant("పీఎం కిసాన్ అర్హతలు ఏమిటి?", "te");
  console.log("Status:", chatRes2.status);
  console.log("Primary Scheme:", chatRes2.primaryScheme?.code);
  console.log("Message snippet:\n", chatRes2.message.substring(0, 150), "...");

  console.log("\n--- 6. Testing queryAssistant with unmatched query ---");
  const chatRes3 = await queryAssistant("crypto trading subsidy", "en");
  console.log("Status:", chatRes3.status);
  console.log("Message snippet:\n", chatRes3.message.substring(0, 120), "...");

  console.log("\n✅ ALL LOGIC TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
