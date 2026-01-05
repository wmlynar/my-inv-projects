# **Specyfikacja – Etap 1**

System logistyki wewnętrznej oparty o RDS – obszar kompresorów, linie A1/A2

**Autor:** Wojciech Młynarczyk



---



## **0. Kontekst i założenia Etapu 1**

Etap 1 wdrożenia AGV / RDS w Sanden (obszar kompresorów, linie A1/A2) jest etapem przejściowym przed docelowym wdrożeniem pełnej logiki systemu logistyki wewnętrznej.

W Etapie 1 AGV przewozi nośniki pomiędzy polami przy liniach produkcyjnych a **specjalnymi tymczasowymi polami buforowymi w magazynie**. Przemieszczanie nośników pomiędzy tymczasowymi polami buforowymi a pozostałymi polami i strefami na obszarze magazynu pozostaje w tym etapie w rękach magazyniera.

Pełny zakres docelowy kolejnych etapów wdrożenia został opisany w analizie przedwdrożeniowej dla obszaru kompresorów oraz w macierzy opakowań SMP. Etap 1 koncentruje się na pierwszym, uproszczonym etapie uruchomienia systemu w środowisku produkcyjnym.

W szczególności w Etapie 1:

- nie jest wdrażana złożona logika wyboru opakowań na podstawie macierzy opakowań,
- nie jest wdrażane zarządzanie buforami 3D (alejki, poziomy, optymalne ułożenie),
- testujemy przede wszystkim ruch AGV między magazynem a produkcją oraz zachowanie AGV w obszarze linii A1/A2,
- odpowiedzialność za szczegółową organizację magazynu (regały, strefy P/C/D/F, strefy odpadu) pozostaje po stronie magazynu.

Etap 1 ma charakter **wdrożenia produkcyjnego o uproszczonej logice** – ma pozwolić sprawdzić i ustabilizować kluczowe przepływy, nie angażując jeszcze pełnej warstwy decyzyjnej.

W Etapie 1 korzystamy wyłącznie ze **standardowych funkcji RDS** oraz prostych zgłoszeń z tabletów na liniach i w magazynie.



---



## **1. Cel i zakres Etapu 1**

### **1.1 Cel biznesowy**

Celem Etapu 1 jest:

- ułatwienie wdrożenia docelowego systemu poprzez podzielenie go na prostsze etapy,
- przetestowanie i ustabilizowanie ruchu AGV na odcinku **magazyn ↔ produkcja** dla linii A1/A2,
- dopracowanie współpracy AGV z operatorami linii i magazynu.

Etap 1 obejmuje następujące przepływy logistyczne dla linii A1/A2:

- dostarczanie pustych opakowań na linie produkcyjne,
- dostarczanie materiałów dodatkowych (słupki, przekładki) na pola G1/G2,
- odbiór wyrobów gotowych z linii do magazynu,
- odbiór odpadów z montażu (C1/C2) do magazynu,
- zwrot niewykorzystanych pustych opakowań z linii do magazynu.

Szczegółowe przepływy opisuje rozdział 4 w postaci strumieni S1–S5.

### **1.2 Zakres procesowy**

Etap 1 obejmuje logistykę wewnętrzną dla obszaru kompresorów (linie A1 i A2), w szczególności:

- pola zaopatrzenia linii w opakowania (PROD\_A\*\_SUP),
- pola wyrobów gotowych (PROD\_A\*\_OUT),
- pola odpadów z montażu (C1/C2),
- pola materiałów dodatkowych przy liniach (G1/G2),
- bufory wysyłkowe opakowań i materiałów dodatkowych po stronie magazynu (MAG\_A\*\_SUP\_TMP, MAG\_G\*\_SUP),
- wspólny bufor odbiorów z produkcji w magazynie (MAG\_OUT\_COLLECT\_TMP).

Rozdział 2 opisuje role i odpowiedzialności użytkowników. Rozdział 3 opisuje pola procesowe, a rozdział 4 strumienie transportowe S1–S5.



---



## **2. Role i odpowiedzialności**

### **2.1 Operator linii (A1 / A2)**

Operator linii A1/A2:

- **Obsługa nośników na linii:**
  - odkłada nośniki z opakowaniami na pola zaopatrzenia PROD\_A\*\_SUP,
  - odkłada nośniki z wyrobami gotowymi na pola PROD\_A\*\_OUT,
  - odkłada nośniki z odpadami na pola C1/C2,
  - korzysta z materiałów dodatkowych dostarczonych na G1/G2.
- **Zgłoszenia z tabletu na linii:**
  - „Przywieź opakowanie” – zgłoszenie potrzeby dostawy opakowań na PROD\_A\*\_SUP,
  - „Zabierz opakowanie” – zgłoszenie zwrotu pustego lub niewykorzystanego opakowania z PROD\_A\*\_SUP,
  - „Odbierz wyrób gotowy” – zgłoszenie gotowości nośnika z wyrobem gotowym na PROD\_A\*\_OUT,
  - „Odbierz odpady” – zgłoszenie gotowości nośnika z odpadami na C1/C2,
  - „Przywieź materiały dodatkowe” – zgłoszenie potrzeby słupków/przekładek na G1/G2.
- **Odpowiedzialność za zgodność stanu fizycznego z zgłoszeniami:**
  - przycisk „Przywieź opakowanie” jest używany tylko wtedy, gdy fizycznie jest miejsce na nośnik na PROD\_A\*\_SUP,
  - przycisk „Zabierz opakowanie” – tylko wtedy, gdy na PROD\_A\*\_SUP faktycznie stoi nośnik przeznaczony do zwrotu,
  - „Odbierz wyrób gotowy” – gdy nośnik z produktem stoi na PROD\_A\*\_OUT,
  - „Odbierz odpady” – gdy nośnik z odpadami stoi na C1/C2.

System w Etapie 1 **nie sprawdza automatycznie zajętości pól po stronie linii** – zakłada poprawne użycie przycisków przez operatora.

### **2.2 Magazynier**

Magazynier:

- **Przygotowanie nośników do wysyłki:**
  - kompletowanie nośników z opakowaniami na bufory wysyłkowe MAG\_A1\_SUP\_TMP, MAG\_A2\_SUP\_TMP,
  - kompletowanie nośników z materiałami dodatkowymi na MAG\_G1\_SUP, MAG\_G2\_SUP.
- **Odbiór z produkcji:**
  - odbiera nośniki z wyrobami gotowymi, pustymi opakowaniami i odpadami ze wspólnego bufora odbiorów MAG\_OUT\_COLLECT\_TMP,
  - przekłada je na docelowe pola magazynowe (P, C, D, F, strefa odpadu, inne), zgodnie z obowiązującymi procedurami.
- **Obsługa tabletów magazynowych:**
  - oznacza, że na buforach wysyłkowych stoją nośniki gotowe do wysłania na produkcję,
  - oznacza, które miejsca w buforze odbiorów MAG\_OUT\_COLLECT\_TMP są zajęte, a które wolne,
  - ma podgląd przyjazdów nośników z produkcji.

Etap 1 **nie zmienia docelowej organizacji magazynu** – magazynier nadal zarządza składowaniem wewnątrz magazynu przy użyciu wózka widłowego.

### **2.3 System AGV + RDS**

System AGV + RDS:

- realizuje transport między polami po stronie produkcji i magazynu zgodnie ze strumieniami S1–S5,
- korzysta ze standardowych mechanizmów RDS (worksite’y, szablony zadań, Wind Task),
- reaguje na zgłoszenia z tabletów oraz stan podstawowych pól magazynowych,
- nie realizuje jeszcze wyboru typu opakowania, optymalizacji buforów 3D ani planowania pracy magazynierów.



---



## **3. Pola procesowe**

### **3.1 Uwaga terminologiczna – „nośnik”**

W dokumencie używamy pojęcia **nośnik** jako neutralnego określenia jednostki transportowej (np. paleta, kosz, pojemnik), na której mogą znajdować się:

- opakowania,
- wyroby gotowe,
- odpady.

Tam, gdzie ma to znaczenie, wyróżniamy:

- **opakowania** (w tym "puste opakowania" – opakowania powracające z linii),
- **wyroby / produkty gotowe**,
- **odpady**.

### **3.2 Pola po stronie produkcji**

- **A1\_IN**, **A2\_IN** – pola zaopatrzenia linii A1/A2 w opakowania:
  - AGV odkłada tu nośniki z opakowaniami (S1),
  - z tych pól odbierane są nośniki z pustymi lub niewykorzystanymi opakowaniami do zwrotu (S5).
- **A1\_OUT**, **A2\_OUT** – pola wyrobów gotowych:
  - operator odkłada tu nośniki z wyrobami gotowymi,
  - AGV odbiera stąd nośniki z wyrobami do magazynu (S3).
- **C1**, **C2** – pola odpadów z montażu A1/A2:
  - odkładane są tu nośniki z odpadami,
  - AGV odbiera stąd nośniki z odpadami do magazynu (S4).
- **G1**, **G2** – pola materiałów dodatkowych przy liniach:
  - AGV odkłada tu nośniki ze słupkami, przekładkami itp. (S2),
  - operator pobiera z nich elementy na potrzeby procesu pakowania.

### **3.3 Pola po stronie magazynu**

- **MAG\_A1\_SUP\_TMP**, **MAG\_A2\_SUP\_TMP** – bufory wysyłkowe opakowań:
  - magazynier odkłada tu nośniki z opakowaniami dla A1/A2,
  - AGV pobiera stąd nośniki do dostawy na PROD\_A\*\_SUP (S1).
- **MAG\_G1\_SUP**, **MAG\_G2\_SUP** – bufory wysyłkowe materiałów dodatkowych:
  - magazynier odkłada tu nośniki ze słupkami/przekładkami,
  - AGV pobiera stąd nośniki do dostawy na G1/G2 (S2).
- **MAG\_OUT\_COLLECT\_TMP** – wspólny bufor odbiorów z produkcji:
  - przyjmuje nośniki z:
    - wyrobami gotowymi (S3),
    - odpadami z montażu (S4),
    - pustymi lub niewykorzystanymi opakowaniami (S5),
  - bufor składa się z kilku miejsc; każde miejsce może być zajęte lub wolne,
  - dalsze rozmieszczenie nośników wewnątrz magazynu odbywa się ręcznie.



---



## **4. Strumienie procesowe S1–S5**

Strumienie opisują logiczne przepływy między polami po stronie produkcji i magazynu.

| **Strumień** | **Co jest przewożone**                               | **Skąd → Dokąd**                        |
| ------------ | ---------------------------------------------------- | --------------------------------------- |
| **S1**       | nośnik z opakowaniami                                | MAG\_A\*\_SUP\_TMP → PROD\_A\*\_SUP     |
| **S2**       | nośnik z materiałami dodatkowymi (słupki/przekładki) | MAG\_G\*\_SUP → G1 / G2                 |
| **S3**       | nośnik z wyrobem gotowym                             | PROD\_A\*\_OUT → MAG\_OUT\_COLLECT\_TMP |
| **S4**       | nośnik z odpadami z montażu                          | C1 / C2 → MAG\_OUT\_COLLECT\_TMP        |
| **S5**       | nośnik z pustymi lub niewykorzystanymi opakowaniami  | PROD\_A\*\_SUP → MAG\_OUT\_COLLECT\_TMP |

Warunki, kiedy poszczególne strumienie są uruchamiane przez RDS, opisuje rozdział 5.



---



## **5. Logika działania w RDS (ujęcie biznesowe)**

W Etapie 1 system RDS działa w oparciu o proste sygnały z linii i magazynu:

- zgłoszenia z tabletów na liniach (potrzeba dostawy / odbioru),
- oznaczenia stanu podstawowych buforów magazynowych (nośniki gotowe / wolne miejsca).

Na tej podstawie RDS uruchamia zadania AGV dla strumieni S1–S5.

### **5.1 Zasada ogólna**

Dla każdego strumienia (S1–S5) w RDS zdefiniowany jest Wind Task, który:

1. odczytuje zgłoszenia z linii (przyciski na tabletach),
2. sprawdza stan odpowiednich pól magazynowych (bufory wysyłkowe, bufor odbiorów),
3. jeśli zgłoszenie z linii i stan magazynu są zgodne z warunkami danego strumienia – tworzy zadanie AGV,
4. zapobiega tworzeniu podwójnych zadań dla tej samej linii i typu żądania.

### **5.2 Mapowanie strumieni na logikę RDS**

| Strumień | RDS uruchamia zadanie, gdy…                                                                                | Szablon zadania                |
| -------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **S1**   | linia nacisnęła „Przywieź opakowanie” **i** nośnik z opakowaniami stoi na MAG\_A\*\_SUP\_TMP               | TASK\_SUPPLY\_LINE             |
| **S2**   | linia nacisnęła „Przywieź materiały dodatkowe” **i** nośnik z materiałem stoi na MAG\_G\*\_SUP             | TASK\_SUPPLY\_AUX              |
| **S3**   | linia nacisnęła „Odbierz wyrób gotowy” **i** w MAG\_OUT\_COLLECT\_TMP jest wolne miejsce na kolejny nośnik | TASK\_PICK\_FROM\_LINE         |
| **S4**   | linia nacisnęła „Odbierz odpady” **i** w MAG\_OUT\_COLLECT\_TMP jest wolne miejsce                         | TASK\_PICK\_FROM\_RETURNS      |
| **S5**   | linia nacisnęła „Zabierz opakowanie” **i** w MAG\_OUT\_COLLECT\_TMP jest wolne miejsce                     | TASK\_RETURN\_PACK\_FROM\_LINE |

RDS nie podejmuje decyzji, co dalej dzieje się z nośnikiem wewnątrz magazynu – po dostarczeniu na MAG\_OUT\_COLLECT\_TMP odpowiedzialność wraca do magazyniera.



---



## **6. Interfejsy użytkownika (tablety)**

### **6.1 Tablety na liniach A1/A2**

Na każdej linii (A1, A2) znajduje się tablet, z którego operator zgłasza potrzeby logistyczne.

Przyciski na tablecie i ich znaczenie:

| Przycisk                         | Znaczenie biznesowe                                         | Strumień |
| -------------------------------- | ----------------------------------------------------------- | -------- |
| **Przywieź opakowanie**          | potrzeba nowego nośnika z opakowaniami na PROD\_A\*\_SUP    | S1       |
| **Zabierz opakowanie**           | zwrot pustego/niewykorzystanego opakowania z PROD\_A\*\_SUP | S5       |
| **Odbierz wyrób gotowy**         | nośnik z produktem gotowym stoi na PROD\_A\*\_OUT           | S3       |
| **Odbierz odpady**               | nośnik z odpadami stoi na C1/C2                             | S4       |
| **Przywieź materiały dodatkowe** | potrzeba słupków/przekładek na G1/G2                        | S2       |

System nie pokazuje stanu zajętości pól przy linii – zakłada, że operator używa przycisków zgodnie z rzeczywistością.

Dla opakowań obowiązuje zasada:

dla danej linii w jednym momencie aktywne jest albo zgłoszenie dostawy opakowania, albo zgłoszenie zwrotu opakowania.

### **6.2 Tablety magazynowe**

Tablety magazynowe pozwalają magazynierowi:

- oznaczać nośniki na buforach wysyłkowych (opisywać je jako **gotowe do wysłania** na produkcję),
- oznaczać, które miejsca bufora odbiorów MAG\_OUT\_COLLECT\_TMP są zajęte, a które wolne,
- śledzić, jakie nośniki przyjechały z produkcji, i podejmować dalsze działania.

Na podstawie tych oznaczeń RDS wie, czy:

- może rozpocząć kolejną dostawę (jest nośnik gotowy na buforze wysyłkowym),
- może odebrać kolejny nośnik z produkcji (jest wolne miejsce w MAG\_OUT\_COLLECT\_TMP).



---



## **7. Zakres kolejnych etapów**

W kolejnych etapach wdrożenia planuje się rozszerzenie systemu m.in. o:

- logikę wyboru opakowań opartą o macierz opakowań SMP,
- zarządzanie buforami 3D (alejki, poziomy, optymalizacja ułożenia nośników),
- automatyczny wybór typów opakowań i konfiguracji sztaplowania dla poszczególnych produktów,
- rozszerzoną warstwę decyzyjną nad RDS (w tym wyjaśnianie decyzji w interfejsach).

Etap 1 ma dostarczyć:

- sprawdzony w praktyce mechanizm zasilania linii i odbioru z linii za pomocą AGV,
- doświadczenia w pracy z AGV na obszarze produkcji,
- dane i obserwacje potrzebne do zaprojektowania kolejnych etapów.

\
