# Appendix C — tracerpid_trakcie_dzialania (verbatim)

# TracerPid — czy trzeba sprawdzać tylko na starcie?

`TracerPid` **może się zmieniać w trakcie działania** procesu.

- Gdy nikt Cię nie śledzi: `TracerPid: 0`.
- Gdy ktoś zrobi **attach** (np. debugger/trace’owanie przez mechanizm `ptrace`): `TracerPid` stanie się PID-em procesu, który Cię śledzi.
- Gdy tracer zrobi **detach** albo zniknie (np. zakończy się), `TracerPid` zwykle wraca do `0`.

## Wniosek praktyczny

- Sprawdzenie **tylko przy starcie** wykryje uruchomienie „pod debuggerem”, ale **nie** wykryje późniejszego *attach*.
- Jeśli chcesz wykrywać *attach* „w locie”, sprawdzaj `TracerPid`:
  - **okresowo** (np. co kilka–kilkanaście sekund), albo
  - w **punktach krytycznych** (tuż przed odszyfrowaniem / załadowaniem wrażliwego kodu, wykonaniem licencji, itp.).

## Uwaga o wątkach

W Linuksie `/proc/<pid>/status` dotyczy konkretnego „taska” (w praktyce: wątku). W typowych przypadkach debugowanie obejmuje cały proces, ale technicznie można śledzić też pojedyncze TID. Jeśli chcesz być bardziej rygorystyczny, możesz sprawdzać również:

- `/proc/self/task/<tid>/status` dla wszystkich wątków.

---

Nota: poprzednio wkleiłem znaczniki typu `turn...` wyglądające jak cytowania — to nie były prawdziwe linki/źródła. Tutaj masz czystą, samowystarczalną wersję odpowiedzi.

