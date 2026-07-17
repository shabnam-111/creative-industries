// data.js
// Global namespace containing static database content for Creative Industries

window.CreativeData = {
  products: [
    {
      id: "door-outer-panel",
      name: "Door Outer Panel",
      sku: "CI-DOP-08",
      material: "Cold Rolled Steel",
      grade: "CR4 Steel",
      thickness: "0.8mm",
      weight: "4.2 kg",
      dimensions: "1100 x 850 x 120 mm",
      price: 1850,
      minOrder: 10,
      deliveryTime: "3-5 Days",
      compatibility: ["Maruti Swift", "Hyundai i20", "Honda City", "Tata Altroz"],
      description: "Premium grade outer door panel skin designed to match OEM standards for exact fitment and crash performance. Features pre-applied anti-corrosive primer coating.",
      image: "https://images.openai.com/static-rsc-4/8yQ_hgULwITNA2IzsKjJidcX9BpU5iOs_hO2ZVbqXq-M8TjWO8IN-GVe4gTecYCET2mOdEsSrcU-G3bj752gVDQooSZLQdcSJi9KNlPT62xCQCybYSVgqulLVDCM8P2tjYQOQzEX7cBPgaqkrTR71GcY7eHaEe-euMossR-RF9juYfxC-SAPMmsyEmsDDpmt?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 650
      }
    },
    {
      id: "bonnet-hood-panel",
      name: "Bonnet Hood Panel",
      sku: "CI-BHP-10",
      material: "Deep Draw Quality Steel",
      grade: "CR4 Steel",
      thickness: "1.0mm",
      weight: "8.5 kg",
      dimensions: "1400 x 1200 x 150 mm",
      price: 4200,
      minOrder: 5,
      deliveryTime: "4-6 Days",
      compatibility: ["Mahindra XUV700", "Tata Harrier", "Hyundai Creta", "Kia Seltos"],
      description: "Precision engineered engine hood panel. Features integrated reinforcement ribs to ensure optimal structural integrity and pedestrian safety compliance.",
      image: "https://images.openai.com/static-rsc-4/wziNLZsjlCKe9mI6RuU8d4f6Mxcb0VJy6JqRVqe4dckcBSU6rWukgUj4WetKB0OtLmqtof4gMsCIZK0l598duM1uCdtubp7VaEequv9RU_BK9OxE5M-UtQnCw9c7mpVJXu_mjpoII2xw_gsPvEzM03PF2pnb8RAGm5pyiRwmSEQovTNxE1jFHUSoGdfglDmh?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 430
      }
    },
    {
      id: "front-fender",
      name: "Front Fender",
      sku: "CI-FF-08",
      material: "Cold Rolled Steel",
      grade: "CR3 Steel",
      thickness: "0.8mm",
      weight: "2.8 kg",
      dimensions: "950 x 600 x 80 mm",
      price: 1250,
      minOrder: 20,
      deliveryTime: "3-5 Days",
      compatibility: ["Tata Nexon", "Maruti Baleno", "Kia Seltos", "Hyundai Venue"],
      description: "OEM compatible front fender panels. Laser-trimmed edges guarantee clean panel gaps and smooth integration with front bumper mounts.",
      image: "https://images.openai.com/static-rsc-4/GZLVzvmBaWV_RG1iSI582_lVz3vPCW-y3JQdsR5G35ZI5NQ63ujPEDs2MMmy9_8_Fb6Vp8hhZwgKeoqsMuQM_ZtUvrE7Si6FT02_88xKnm5K1BUPsvMfpjayNObgWHvpJ_QvGdLBwH49I1mxyjHectjVmGgsMYZUSbofDMoXZ027dmG6CXJo-APcFtpzKPj7?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 980
      }
    },
    {
      id: "rear-fender",
      name: "Rear Fender",
      sku: "CI-RF-08",
      material: "Cold Rolled Steel",
      grade: "CR3 Steel",
      thickness: "0.8mm",
      weight: "3.1 kg",
      dimensions: "1050 x 650 x 90 mm",
      price: 1450,
      minOrder: 10,
      deliveryTime: "3-5 Days",
      compatibility: ["Maruti Dzire", "Hyundai Verna", "Honda Amaze", "Tata Tigor"],
      description: "Form-fit rear outer fender skins. Offers superior resistance against rust and road debris with standard zinc-phosphate pre-treatment.",
      image: "https://images.openai.com/static-rsc-4/pz-pwUiXridG6n6LcDc_QGQsMYnI11F5xshjxfGK_57uqylz5rjS9--1KihbNt7ORjHux3jJDtU7-tMSa_37Oq4QhXv4Xnwh_VveXn8BKPwOrRd5lXP8Q0-SwDKIAc5dEsfM62eCEjahZYpbAkyw9q_7XOHkiPRv5rjjf9R8GmaAzXYH6pg6ctWWRAeJYC0s?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 720
      }
    },
    {
      id: "roof-panel",
      name: "Roof Panel",
      sku: "CI-RP-12",
      material: "Deep Drawing Quality Steel",
      grade: "CR4 Steel",
      thickness: "1.2mm",
      weight: "12.0 kg",
      dimensions: "2100 x 1300 x 50 mm",
      price: 6800,
      minOrder: 2,
      deliveryTime: "5-7 Days",
      compatibility: ["Mahindra Scorpio", "Tata Safari", "Toyota Innova", "Mahindra Bolero"],
      description: "Heavy-duty roof panel skin providing enhanced cabin safety. Stiffener channels pre-welded on the underside for NVH reduction.",
      image: "https://images.openai.com/static-rsc-4/dEAacjbPFZYjc8bkZiTegmUWxCVXBhpPi_yukOmNV_l6MekH-zY0biUZaQa-3hu5Gox5r0vIK1l1yr8Emt-1TONRJc4WrwCDcM3aOTtSUno2Zse_Lr0psgyjsicNPw_CoT9dELIvry_FPADQfwi-3nGDbeN_GE8Omdjzmirrm_oUQMCAK9RBF3gy3vdeyRnr?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 250
      }
    },
    {
      id: "quarter-panel",
      name: "Quarter Panel",
      sku: "CI-QP-08",
      material: "Cold Rolled Steel",
      grade: "CR3 Steel",
      thickness: "0.8mm",
      weight: "3.5 kg",
      dimensions: "1150 x 700 x 100 mm",
      price: 1900,
      minOrder: 10,
      deliveryTime: "3-5 Days",
      compatibility: ["Hyundai Creta", "Kia Seltos", "Tata Nexon", "MG Hector"],
      description: "Rear quarter panel replacements. Pressed with precision dies to retain exact factory lines for flawless crash repair.",
      image: "https://images.openai.com/static-rsc-4/8yQ_hgULwITNA2IzsKjJidcX9BpU5iOs_hO2ZVbqXq-M8TjWO8IN-GVe4gTecYCET2mOdEsSrcU-G3bj752gVDQooSZLQdcSJi9KNlPT62xCQCybYSVgqulLVDCM8P2tjYQOQzEX7cBPgaqkrTR71GcY7eHaEe-euMossR-RF9juYfxC-SAPMmsyEmsDDpmt?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 520
      }
    },
    {
      id: "floor-panel",
      name: "Floor Panel",
      sku: "CI-FP-15",
      material: "High Strength Steel",
      grade: "HSS Grade 340",
      thickness: "1.5mm",
      weight: "15.5 kg",
      dimensions: "2400 x 1500 x 200 mm",
      price: 8500,
      minOrder: 15,
      deliveryTime: "5-7 Days",
      compatibility: ["Maruti Ertiga", "Toyota Innova", "Mahindra Marazzo", "Tata Punch"],
      description: "High-strength underbody floor panel. Deep corrugated geometry delivers exceptional structural rigidity and minimizes cabin vibration.",
      image: "https://images.openai.com/static-rsc-4/pz-pwUiXridG6n6LcDc_QGQsMYnI11F5xshjxfGK_57uqylz5rjS9--1KihbNt7ORjHux3jJDtU7-tMSa_37Oq4QhXv4Xnwh_VveXn8BKPwOrRd5lXP8Q0-SwDKIAc5dEsfM62eCEjahZYpbAkyw9q_7XOHkiPRv5rjjf9R8GmaAzXYH6pg6ctWWRAeJYC0s?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 900
      }
    },
    {
      id: "tailgate-panel",
      name: "Tailgate Panel",
      sku: "CI-TGP-10",
      material: "Cold Rolled Steel",
      grade: "CR4 Steel",
      thickness: "1.0mm",
      weight: "7.2 kg",
      dimensions: "1200 x 950 x 140 mm",
      price: 3100,
      minOrder: 5,
      deliveryTime: "4-6 Days",
      compatibility: ["Hyundai i20", "Maruti Swift", "Tata Altroz", "Renault Baleno"],
      description: "Precision-drawn tailgate outer panels. Tailored for hatchbacks and SUVs, ensuring flawless seal integration and alignment.",
      image: "https://images.openai.com/static-rsc-4/GZLVzvmBaWV_RG1iSI582_lVz3vPCW-y3JQdsR5G35ZI5NQ63ujPEDs2MMmy9_8_Fb6Vp8hhZwgKeoqsMuQM_ZtUvrE7Si6FT02_88xKnm5K1BUPsvMfpjayNObgWHvpJ_QvGdLBwH49I1mxyjHectjVmGgsMYZUSbofDMoXZ027dmG6CXJo-APcFtpzKPj7?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 350
      }
    },
    {
      id: "radiator-support",
      name: "Radiator Support",
      sku: "CI-RS-16",
      material: "High Strength Steel",
      grade: "HSS Grade 340",
      thickness: "1.6mm",
      weight: "5.4 kg",
      dimensions: "1200 x 400 x 150 mm",
      price: 2100,
      minOrder: 10,
      deliveryTime: "3-5 Days",
      compatibility: ["Maruti Swift", "Maruti Dzire", "Maruti Ertiga", "Hyundai Grand i10"],
      description: "Front structural member carrying the cooling package. Advanced spot-welded brackets for exact fitment of radiator, condenser, and headlamps.",
      image: "https://images.openai.com/static-rsc-4/dEAacjbPFZYjc8bkZiTegmUWxCVXBhpPi_yukOmNV_l6MekH-zY0biUZaQa-3hu5Gox5r0vIK1l1yr8Emt-1TONRJc4WrwCDcM3aOTtSUno2Zse_Lr0psgyjsicNPw_CoT9dELIvry_FPADQfwi-3nGDbeN_GE8Omdjzmirrm_oUQMCAK9RBF3gy3vdeyRnr?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 350
      }
    },
    {
      id: "side-sill",
      name: "Side Sill",
      sku: "CI-SS-12",
      material: "Cold Rolled Steel",
      grade: "CR4 Steel",
      thickness: "1.2mm",
      weight: "2.3 kg",
      dimensions: "1800 x 120 x 80 mm",
      price: 950,
      minOrder: 10,
      deliveryTime: "3-5 Days",
      compatibility: ["Tata Tiago", "Tata Tigor", "Hyundai Santro", "Maruti Celerio"],
      description: "Outer rocker panel and side sill replacements. Essential for structural passenger safety and vehicle floor panel alignment.",
      image: "https://images.openai.com/static-rsc-4/4blJiGFgHo8UfIYbk7uwuMqyMUUGHFQghFs3YrPhUtY3QQMMDKQsEYd63ajCJtm_bo-wickEDOM9qWRlRh80ljiYdXYYOkntHzWhDxqzw4a-dHJRKCxRzUQNmqiEQFDDjIEqBtTAgUvnNDMMtsV3zkwFNl_JpksL9GlbPgo8Zsb2AMNgnQTiP3uFoRZUsXjh?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 610
      }
    },
    {
      id: "battery-tray",
      name: "Battery Tray",
      sku: "CI-BT-20",
      material: "Galvanized Steel",
      grade: "GI Grade 220",
      thickness: "2.0mm",
      weight: "1.1 kg",
      dimensions: "320 x 240 x 60 mm",
      price: 450,
      minOrder: 20,
      deliveryTime: "2-4 Days",
      compatibility: ["Universal Passenger Cars", "Hyundai Creta", "Maruti Swift", "Tata Punch"],
      description: "Heavy-duty hot-dip galvanized steel tray. High corrosion resistance to withstand acid spills and vibrations.",
      image: "https://images.openai.com/static-rsc-4/ohKDn-lnIAoT-InIl6EHN-URRYfXkbTK8-2Tel9TjF28FM0j3qwmO3PmF3oD4GLri-3JMaUnf5to3QTuJFPzFvaiumGs-yFnUynxXSVf7Gzv3bTWXT0SfW1We44giSPGt6mrlK-XNZQStPaTw7K7hLselpVZxKRYebjsXvPhGJVpe7hpDo06qoLUelVvLCXq?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 280
      }
    },
    {
      id: "cross-member",
      name: "Cross Member",
      sku: "CI-CM-20",
      material: "High Strength Steel",
      grade: "HSS Grade 440",
      thickness: "2.0mm",
      weight: "6.8 kg",
      dimensions: "1400 x 150 x 100 mm",
      price: 2800,
      minOrder: 10,
      deliveryTime: "4-6 Days",
      compatibility: ["Mahindra Thar", "Mahindra Scorpio", "Tata Safari", "Force Gurkha"],
      description: "Under-engine or subframe cross member designed to bear chassis torsional forces. Pre-treated with premium EDP black coating.",
      image: "https://images.openai.com/static-rsc-4/AZLVzq7WmpaHaBIXBXTHjwxDK9JBvGug8YFYApfslicWDA1mEZEh7HEg4vnuDaV6C1l3GnO5zc3NK69CYpf8rWw5Ag3V4PEiNnqe0scFXlbK_jtRCUBDhOS2Dqfu4C4R4e9mVtc5_RrtbDXPvLkBu0EUtKncLHjJWpY-zbs4sPuQTtP2AxAxTDcDnaC8gQva?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 450
      }
    },
    {
      id: "wheel-housing",
      name: "Wheel Housing",
      sku: "CI-WH-10",
      material: "Cold Rolled Steel",
      grade: "CR3 Steel",
      thickness: "1.0mm",
      weight: "2.5 kg",
      dimensions: "600 x 600 x 250 mm",
      price: 1150,
      minOrder: 10,
      deliveryTime: "3-5 Days",
      compatibility: ["Maruti Brezza", "Toyota Urban Cruiser", "Hyundai Venue", "Kia Sonet"],
      description: "Inner wheel arch housing liner. Offers superb sound dampening properties and exact clearance for full suspension travel.",
      image: "https://images.openai.com/static-rsc-4/ohKDn-lnIAoT-InIl6EHN-URRYfXkbTK8-2Tel9TjF28FM0j3qwmO3PmF3oD4GLri-3JMaUnf5to3QTuJFPzFvaiumGs-yFnUynxXSVf7Gzv3bTWXT0SfW1We44giSPGt6mrlK-XNZQStPaTw7K7hLselpVZxKRYebjsXvPhGJVpe7hpDo06qoLUelVvLCXq?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 320
      }
    },
    {
      id: "cowl-panel",
      name: "Cowl Panel",
      sku: "CI-CP-08",
      material: "Cold Rolled Steel",
      grade: "CR4 Steel",
      thickness: "0.8mm",
      weight: "1.8 kg",
      dimensions: "1300 x 250 x 50 mm",
      price: 850,
      minOrder: 15,
      deliveryTime: "3-5 Days",
      compatibility: ["Honda Amaze", "Hyundai Aura", "Maruti Dzire", "Tata Tigor"],
      description: "Scuttle cowl panel positioned beneath the windscreen. Formed with precise drain holes to prevent water accumulation and rust.",
      image: "https://images.openai.com/static-rsc-4/dEAacjbPFZYjc8bkZiTegmUWxCVXBhpPi_yukOmNV_l6MekH-zY0biUZaQa-3hu5Gox5r0vIK1l1yr8Emt-1TONRJc4WrwCDcM3aOTtSUno2Zse_Lr0psgyjsicNPw_CoT9dELIvry_FPADQfwi-3nGDbeN_GE8Omdjzmirrm_oUQMCAK9RBF3gy3vdeyRnr?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 500
      }
    },
    {
      id: "reinforcement-plate",
      name: "Reinforcement Plate",
      sku: "CI-RP-25",
      material: "High Strength Steel",
      grade: "HSS Grade 440",
      thickness: "2.5mm",
      weight: "0.9 kg",
      dimensions: "250 x 150 x 20 mm",
      price: 320,
      minOrder: 50,
      deliveryTime: "2-4 Days",
      compatibility: ["Structural Universal", "Tata Punch", "Mahindra Bolero", "Maruti Eeco"],
      description: "Heavy duty reinforcing steel plates used in chassis joinery and bumper bracket reinforcement to provide superior stiffness.",
      image: "https://images.openai.com/static-rsc-4/ohKDn-lnIAoT-InIl6EHN-URRYfXkbTK8-2Tel9TjF28FM0j3qwmO3PmF3oD4GLri-3JMaUnf5to3QTuJFPzFvaiumGs-yFnUynxXSVf7Gzv3bTWXT0SfW1We44giSPGt6mrlK-XNZQStPaTw7K7hLselpVZxKRYebjsXvPhGJVpe7hpDo06qoLUelVvLCXq?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 900
      }
    },
    {
      id: "engine-mount-bracket",
      name: "Engine Mount Bracket",
      sku: "CI-EMB-30",
      material: "Heavy Gauge High Strength Steel",
      grade: "HSS Grade 590",
      thickness: "3.0mm",
      weight: "1.5 kg",
      dimensions: "200 x 180 x 120 mm",
      price: 550,
      minOrder: 20,
      deliveryTime: "3-5 Days",
      compatibility: ["Tata Punch", "Maruti WagonR", "Hyundai Santro", "Maruti Celerio"],
      description: "Thick 3mm steel engine support brackets. Formed on progressive stamping presses and tested for fatigue resistance under engine loads.",
      image: "https://images.openai.com/static-rsc-4/AZLVzq7WmpaHaBIXBXTHjwxDK9JBvGug8YFYApfslicWDA1mEZEh7HEg4vnuDaV6C1l3GnO5zc3NK69CYpf8rWw5Ag3V4PEiNnqe0scFXlbK_jtRCUBDhOS2Dqfu4C4R4e9mVtc5_RrtbDXPvLkBu0EUtKncLHjJWpY-zbs4sPuQTtP2AxAxTDcDnaC8gQva?purpose=fullsize",
      stockByWarehouse: {
        "Faridabad Works": 1100
      }
    }
  ],
  clients: [
    { name: "Moglix", logo: "https://images.openai.com/static-rsc-4/Wd9-v92xUFI8VrqbA70Ob3onsLWdlL2ljTf43O_pySncoW84ToQkQ88SkmsLyYpIfYY-3cUmHCW963ug-3ioP-s7C1vK4wIfAsvOkLi3HqoIdE0FSIdfMVYai4vhJhTdDJ5hAVTEf-Z5AoFDLkpzsV7PsFE-Etyd9ikwDlEd4BiyxXYjlz28hjD06lbEPYlb?purpose=fullsize" },
    { name: "Hero MotoCorp (Faridabad)", logo: "https://images.openai.com/static-rsc-4/i2ZEU4tIY-4VDa6m738musqiEF7wIdJvYr-g10ZrYQjtUQNEbVkOjAaN9vvSlqaIeHco-8-z8ZdzelVIzPpXsVq2wy1aRfL66hFFtXcrQm57PMLulIBd8z7rAsEHoq5M0nhDc1qfDVc6Jk1yfGm5BXIixnjzItODVSl2ulp8b1iqK2qkEOwL_qQ9UgbM9x17?purpose=fullsize" },
    { name: "Maruti Suzuki", logo: "https://images.openai.com/static-rsc-4/hwFk4mJKJzcFsvz-ULClG16uzcCABcbK0iytAemQ8RCKVNdLBhuC6xI2vJPm3MID0e_2rc17Y_FfnudnIThORzR1jFo5VxSCoK08lfvbcbiIvPBlUId1fgQPJfTpF3RzUMcrXzZnSnKPyemJGgHLEYeivIGLiBARu2L8nzrlYhQLzjaJMBeM-6XKAGJrVTJz?purpose=fullsize" },
    { name: "Mahindra & Mahindra", logo: "https://images.openai.com/static-rsc-4/21i_1hVcmDuePTGyfLPSU5kTIaB8UafijTREIJfQZaL023R0Iy5p2SZS595A8GVpXqK1Fjr-E7EBQHhBJ8DzjomqdWVwfQ1onQF5q4nNxMWZg0VevZvBC5D_9miP7jEdpijA5lGRlZN25nCQKn4GEbsDdB7wuKLnr6gu4Rk0ACOiJnhgW2U96e54wnsFRucc?purpose=fullsize" }
  ],
  industries: [
    { name: "Passenger Vehicles", icon: "🚗", desc: "Providing premium OEM outer panels and structural brackets for hatchbacks, sedans, and SUVs across India." },
    { name: "Commercial Vehicles", icon: "🚛", desc: "Supplying reinforced steel cross members and chassis joinery components designed for heavy-duty commercial fleets." },
    { name: "Two Wheelers", icon: "🏍", desc: "High-volume stamping parts, battery mounts, and decorative guard elements for leading motorcycle manufacturers." },
    { name: "Agricultural Machinery", icon: "🚜", desc: "Custom heavy-gauge sheet metal fittings engineered to survive harsh soil conditions and high mechanical strain." },
    { name: "Industrial Equipment", icon: "🏗", desc: "Enclosures, mounting brackets, and load-bearing floor layouts for machine tools and infrastructure systems." },
    { name: "OEM Manufacturing", icon: "⚙", desc: "Direct contract manufacturing, supplying exact custom-pressed components directly to assembly pipelines." }
  ]
};
