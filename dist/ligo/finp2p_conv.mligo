#if !FINP2P_CONV
#define FINP2P_CONV

let nat_to_byte (n : nat) : bytes =
  if n <= 127n
  then
    (if n <= 63n
     then
       (if n <= 31n
        then
          (if n <= 15n
           then
             (if n <= 7n
              then
                (if n <= 3n
                 then
                   (if n <= 1n
                    then (if n <= 0n then 0x00 else 0x01)
                    else if n <= 2n then 0x02 else 0x03)
                 else
                 if n <= 5n
                 then (if n <= 4n then 0x04 else 0x05)
                 else if n <= 6n then 0x06 else 0x07)
              else
              if n <= 11n
              then
                (if n <= 9n
                 then (if n <= 8n then 0x08 else 0x09)
                 else if n <= 10n then 0x0a else 0x0b)
              else
              if n <= 13n
              then (if n <= 12n then 0x0c else 0x0d)
              else if n <= 14n then 0x0e else 0x0f)
           else
           if n <= 23n
           then
             (if n <= 19n
              then
                (if n <= 17n
                 then (if n <= 16n then 0x10 else 0x11)
                 else if n <= 18n then 0x12 else 0x13)
              else
              if n <= 21n
              then (if n <= 20n then 0x14 else 0x15)
              else if n <= 22n then 0x16 else 0x17)
           else
           if n <= 27n
           then
             (if n <= 25n
              then (if n <= 24n then 0x18 else 0x19)
              else if n <= 26n then 0x1a else 0x1b)
           else
           if n <= 29n
           then (if n <= 28n then 0x1c else 0x1d)
           else if n <= 30n then 0x1e else 0x1f)
        else
        if n <= 47n
        then
          (if n <= 39n
           then
             (if n <= 35n
              then
                (if n <= 33n
                 then (if n <= 32n then 0x20 else 0x21)
                 else if n <= 34n then 0x22 else 0x23)
              else
              if n <= 37n
              then (if n <= 36n then 0x24 else 0x25)
              else if n <= 38n then 0x26 else 0x27)
           else
           if n <= 43n
           then
             (if n <= 41n
              then (if n <= 40n then 0x28 else 0x29)
              else if n <= 42n then 0x2a else 0x2b)
           else
           if n <= 45n
           then (if n <= 44n then 0x2c else 0x2d)
           else if n <= 46n then 0x2e else 0x2f)
        else
        if n <= 55n
        then
          (if n <= 51n
           then
             (if n <= 49n
              then (if n <= 48n then 0x30 else 0x31)
              else if n <= 50n then 0x32 else 0x33)
           else
           if n <= 53n
           then (if n <= 52n then 0x34 else 0x35)
           else if n <= 54n then 0x36 else 0x37)
        else
        if n <= 59n
        then
          (if n <= 57n
           then (if n <= 56n then 0x38 else 0x39)
           else if n <= 58n then 0x3a else 0x3b)
        else
        if n <= 61n
        then (if n <= 60n then 0x3c else 0x3d)
        else if n <= 62n then 0x3e else 0x3f)
     else
     if n <= 95n
     then
       (if n <= 79n
        then
          (if n <= 71n
           then
             (if n <= 67n
              then
                (if n <= 65n
                 then (if n <= 64n then 0x40 else 0x41)
                 else if n <= 66n then 0x42 else 0x43)
              else
              if n <= 69n
              then (if n <= 68n then 0x44 else 0x45)
              else if n <= 70n then 0x46 else 0x47)
           else
           if n <= 75n
           then
             (if n <= 73n
              then (if n <= 72n then 0x48 else 0x49)
              else if n <= 74n then 0x4a else 0x4b)
           else
           if n <= 77n
           then (if n <= 76n then 0x4c else 0x4d)
           else if n <= 78n then 0x4e else 0x4f)
        else
        if n <= 87n
        then
          (if n <= 83n
           then
             (if n <= 81n
              then (if n <= 80n then 0x50 else 0x51)
              else if n <= 82n then 0x52 else 0x53)
           else
           if n <= 85n
           then (if n <= 84n then 0x54 else 0x55)
           else if n <= 86n then 0x56 else 0x57)
        else
        if n <= 91n
        then
          (if n <= 89n
           then (if n <= 88n then 0x58 else 0x59)
           else if n <= 90n then 0x5a else 0x5b)
        else
        if n <= 93n
        then (if n <= 92n then 0x5c else 0x5d)
        else if n <= 94n then 0x5e else 0x5f)
     else
     if n <= 111n
     then
       (if n <= 103n
        then
          (if n <= 99n
           then
             (if n <= 97n
              then (if n <= 96n then 0x60 else 0x61)
              else if n <= 98n then 0x62 else 0x63)
           else
           if n <= 101n
           then (if n <= 100n then 0x64 else 0x65)
           else if n <= 102n then 0x66 else 0x67)
        else
        if n <= 107n
        then
          (if n <= 105n
           then (if n <= 104n then 0x68 else 0x69)
           else if n <= 106n then 0x6a else 0x6b)
        else
        if n <= 109n
        then (if n <= 108n then 0x6c else 0x6d)
        else if n <= 110n then 0x6e else 0x6f)
     else
     if n <= 119n
     then
       (if n <= 115n
        then
          (if n <= 113n
           then (if n <= 112n then 0x70 else 0x71)
           else if n <= 114n then 0x72 else 0x73)
        else
        if n <= 117n
        then (if n <= 116n then 0x74 else 0x75)
        else if n <= 118n then 0x76 else 0x77)
     else
     if n <= 123n
     then
       (if n <= 121n
        then (if n <= 120n then 0x78 else 0x79)
        else if n <= 122n then 0x7a else 0x7b)
     else
     if n <= 125n
     then (if n <= 124n then 0x7c else 0x7d)
     else if n <= 126n then 0x7e else 0x7f)
  else
  if n <= 191n
  then
    (if n <= 159n
     then
       (if n <= 143n
        then
          (if n <= 135n
           then
             (if n <= 131n
              then
                (if n <= 129n
                 then (if n <= 128n then 0x80 else 0x81)
                 else if n <= 130n then 0x82 else 0x83)
              else
              if n <= 133n
              then (if n <= 132n then 0x84 else 0x85)
              else if n <= 134n then 0x86 else 0x87)
           else
           if n <= 139n
           then
             (if n <= 137n
              then (if n <= 136n then 0x88 else 0x89)
              else if n <= 138n then 0x8a else 0x8b)
           else
           if n <= 141n
           then (if n <= 140n then 0x8c else 0x8d)
           else if n <= 142n then 0x8e else 0x8f)
        else
        if n <= 151n
        then
          (if n <= 147n
           then
             (if n <= 145n
              then (if n <= 144n then 0x90 else 0x91)
              else if n <= 146n then 0x92 else 0x93)
           else
           if n <= 149n
           then (if n <= 148n then 0x94 else 0x95)
           else if n <= 150n then 0x96 else 0x97)
        else
        if n <= 155n
        then
          (if n <= 153n
           then (if n <= 152n then 0x98 else 0x99)
           else if n <= 154n then 0x9a else 0x9b)
        else
        if n <= 157n
        then (if n <= 156n then 0x9c else 0x9d)
        else if n <= 158n then 0x9e else 0x9f)
     else
     if n <= 175n
     then
       (if n <= 167n
        then
          (if n <= 163n
           then
             (if n <= 161n
              then (if n <= 160n then 0xa0 else 0xa1)
              else if n <= 162n then 0xa2 else 0xa3)
           else
           if n <= 165n
           then (if n <= 164n then 0xa4 else 0xa5)
           else if n <= 166n then 0xa6 else 0xa7)
        else
        if n <= 171n
        then
          (if n <= 169n
           then (if n <= 168n then 0xa8 else 0xa9)
           else if n <= 170n then 0xaa else 0xab)
        else
        if n <= 173n
        then (if n <= 172n then 0xac else 0xad)
        else if n <= 174n then 0xae else 0xaf)
     else
     if n <= 183n
     then
       (if n <= 179n
        then
          (if n <= 177n
           then (if n <= 176n then 0xb0 else 0xb1)
           else if n <= 178n then 0xb2 else 0xb3)
        else
        if n <= 181n
        then (if n <= 180n then 0xb4 else 0xb5)
        else if n <= 182n then 0xb6 else 0xb7)
     else
     if n <= 187n
     then
       (if n <= 185n
        then (if n <= 184n then 0xb8 else 0xb9)
        else if n <= 186n then 0xba else 0xbb)
     else
     if n <= 189n
     then (if n <= 188n then 0xbc else 0xbd)
     else if n <= 190n then 0xbe else 0xbf)
  else
  if n <= 223n
  then
    (if n <= 207n
     then
       (if n <= 199n
        then
          (if n <= 195n
           then
             (if n <= 193n
              then (if n <= 192n then 0xc0 else 0xc1)
              else if n <= 194n then 0xc2 else 0xc3)
           else
           if n <= 197n
           then (if n <= 196n then 0xc4 else 0xc5)
           else if n <= 198n then 0xc6 else 0xc7)
        else
        if n <= 203n
        then
          (if n <= 201n
           then (if n <= 200n then 0xc8 else 0xc9)
           else if n <= 202n then 0xca else 0xcb)
        else
        if n <= 205n
        then (if n <= 204n then 0xcc else 0xcd)
        else if n <= 206n then 0xce else 0xcf)
     else
     if n <= 215n
     then
       (if n <= 211n
        then
          (if n <= 209n
           then (if n <= 208n then 0xd0 else 0xd1)
           else if n <= 210n then 0xd2 else 0xd3)
        else
        if n <= 213n
        then (if n <= 212n then 0xd4 else 0xd5)
        else if n <= 214n then 0xd6 else 0xd7)
     else
     if n <= 219n
     then
       (if n <= 217n
        then (if n <= 216n then 0xd8 else 0xd9)
        else if n <= 218n then 0xda else 0xdb)
     else
     if n <= 221n
     then (if n <= 220n then 0xdc else 0xdd)
     else if n <= 222n then 0xde else 0xdf)
  else
  if n <= 239n
  then
    (if n <= 231n
     then
       (if n <= 227n
        then
          (if n <= 225n
           then (if n <= 224n then 0xe0 else 0xe1)
           else if n <= 226n then 0xe2 else 0xe3)
        else
        if n <= 229n
        then (if n <= 228n then 0xe4 else 0xe5)
        else if n <= 230n then 0xe6 else 0xe7)
     else
     if n <= 235n
     then
       (if n <= 233n
        then (if n <= 232n then 0xe8 else 0xe9)
        else if n <= 234n then 0xea else 0xeb)
     else
     if n <= 237n
     then (if n <= 236n then 0xec else 0xed)
     else if n <= 238n then 0xee else 0xef)
  else
  if n <= 247n
  then
    (if n <= 243n
     then
       (if n <= 241n
        then (if n <= 240n then 0xf0 else 0xf1)
        else if n <= 242n then 0xf2 else 0xf3)
     else
     if n <= 245n
     then (if n <= 244n then 0xf4 else 0xf5)
     else if n <= 246n then 0xf6 else 0xf7)
  else
  if n <= 251n
  then
    (if n <= 249n
     then (if n <= 248n then 0xf8 else 0xf9)
     else if n <= 250n then 0xfa else 0xfb)
  else
  if n <= 253n
  then (if n <= 252n then 0xfc else 0xfd)
  else if n <= 254n then 0xfe else 0xff

let nat_to_hex_byte (n : nat) : string =
  if n <= 127n
  then
    (if n <= 63n
     then
       (if n <= 31n
        then
          (if n <= 15n
           then
             (if n <= 7n
              then
                (if n <= 3n
                 then
                   (if n <= 1n
                    then (if n <= 0n then "0x00" else "0x01")
                    else if n <= 2n then "0x02" else "0x03")
                 else
                 if n <= 5n
                 then (if n <= 4n then "0x04" else "0x05")
                 else if n <= 6n then "0x06" else "0x07")
              else
              if n <= 11n
              then
                (if n <= 9n
                 then (if n <= 8n then "0x08" else "0x09")
                 else if n <= 10n then "0x0a" else "0x0b")
              else
              if n <= 13n
              then (if n <= 12n then "0x0c" else "0x0d")
              else if n <= 14n then "0x0e" else "0x0f")
           else
           if n <= 23n
           then
             (if n <= 19n
              then
                (if n <= 17n
                 then (if n <= 16n then "0x10" else "0x11")
                 else if n <= 18n then "0x12" else "0x13")
              else
              if n <= 21n
              then (if n <= 20n then "0x14" else "0x15")
              else if n <= 22n then "0x16" else "0x17")
           else
           if n <= 27n
           then
             (if n <= 25n
              then (if n <= 24n then "0x18" else "0x19")
              else if n <= 26n then "0x1a" else "0x1b")
           else
           if n <= 29n
           then (if n <= 28n then "0x1c" else "0x1d")
           else if n <= 30n then "0x1e" else "0x1f")
        else
        if n <= 47n
        then
          (if n <= 39n
           then
             (if n <= 35n
              then
                (if n <= 33n
                 then (if n <= 32n then "0x20" else "0x21")
                 else if n <= 34n then "0x22" else "0x23")
              else
              if n <= 37n
              then (if n <= 36n then "0x24" else "0x25")
              else if n <= 38n then "0x26" else "0x27")
           else
           if n <= 43n
           then
             (if n <= 41n
              then (if n <= 40n then "0x28" else "0x29")
              else if n <= 42n then "0x2a" else "0x2b")
           else
           if n <= 45n
           then (if n <= 44n then "0x2c" else "0x2d")
           else if n <= 46n then "0x2e" else "0x2f")
        else
        if n <= 55n
        then
          (if n <= 51n
           then
             (if n <= 49n
              then (if n <= 48n then "0x30" else "0x31")
              else if n <= 50n then "0x32" else "0x33")
           else
           if n <= 53n
           then (if n <= 52n then "0x34" else "0x35")
           else if n <= 54n then "0x36" else "0x37")
        else
        if n <= 59n
        then
          (if n <= 57n
           then (if n <= 56n then "0x38" else "0x39")
           else if n <= 58n then "0x3a" else "0x3b")
        else
        if n <= 61n
        then (if n <= 60n then "0x3c" else "0x3d")
        else if n <= 62n then "0x3e" else "0x3f")
     else
     if n <= 95n
     then
       (if n <= 79n
        then
          (if n <= 71n
           then
             (if n <= 67n
              then
                (if n <= 65n
                 then (if n <= 64n then "0x40" else "0x41")
                 else if n <= 66n then "0x42" else "0x43")
              else
              if n <= 69n
              then (if n <= 68n then "0x44" else "0x45")
              else if n <= 70n then "0x46" else "0x47")
           else
           if n <= 75n
           then
             (if n <= 73n
              then (if n <= 72n then "0x48" else "0x49")
              else if n <= 74n then "0x4a" else "0x4b")
           else
           if n <= 77n
           then (if n <= 76n then "0x4c" else "0x4d")
           else if n <= 78n then "0x4e" else "0x4f")
        else
        if n <= 87n
        then
          (if n <= 83n
           then
             (if n <= 81n
              then (if n <= 80n then "0x50" else "0x51")
              else if n <= 82n then "0x52" else "0x53")
           else
           if n <= 85n
           then (if n <= 84n then "0x54" else "0x55")
           else if n <= 86n then "0x56" else "0x57")
        else
        if n <= 91n
        then
          (if n <= 89n
           then (if n <= 88n then "0x58" else "0x59")
           else if n <= 90n then "0x5a" else "0x5b")
        else
        if n <= 93n
        then (if n <= 92n then "0x5c" else "0x5d")
        else if n <= 94n then "0x5e" else "0x5f")
     else
     if n <= 111n
     then
       (if n <= 103n
        then
          (if n <= 99n
           then
             (if n <= 97n
              then (if n <= 96n then "0x60" else "0x61")
              else if n <= 98n then "0x62" else "0x63")
           else
           if n <= 101n
           then (if n <= 100n then "0x64" else "0x65")
           else if n <= 102n then "0x66" else "0x67")
        else
        if n <= 107n
        then
          (if n <= 105n
           then (if n <= 104n then "0x68" else "0x69")
           else if n <= 106n then "0x6a" else "0x6b")
        else
        if n <= 109n
        then (if n <= 108n then "0x6c" else "0x6d")
        else if n <= 110n then "0x6e" else "0x6f")
     else
     if n <= 119n
     then
       (if n <= 115n
        then
          (if n <= 113n
           then (if n <= 112n then "0x70" else "0x71")
           else if n <= 114n then "0x72" else "0x73")
        else
        if n <= 117n
        then (if n <= 116n then "0x74" else "0x75")
        else if n <= 118n then "0x76" else "0x77")
     else
     if n <= 123n
     then
       (if n <= 121n
        then (if n <= 120n then "0x78" else "0x79")
        else if n <= 122n then "0x7a" else "0x7b")
     else
     if n <= 125n
     then (if n <= 124n then "0x7c" else "0x7d")
     else if n <= 126n then "0x7e" else "0x7f")
  else
  if n <= 191n
  then
    (if n <= 159n
     then
       (if n <= 143n
        then
          (if n <= 135n
           then
             (if n <= 131n
              then
                (if n <= 129n
                 then (if n <= 128n then "0x80" else "0x81")
                 else if n <= 130n then "0x82" else "0x83")
              else
              if n <= 133n
              then (if n <= 132n then "0x84" else "0x85")
              else if n <= 134n then "0x86" else "0x87")
           else
           if n <= 139n
           then
             (if n <= 137n
              then (if n <= 136n then "0x88" else "0x89")
              else if n <= 138n then "0x8a" else "0x8b")
           else
           if n <= 141n
           then (if n <= 140n then "0x8c" else "0x8d")
           else if n <= 142n then "0x8e" else "0x8f")
        else
        if n <= 151n
        then
          (if n <= 147n
           then
             (if n <= 145n
              then (if n <= 144n then "0x90" else "0x91")
              else if n <= 146n then "0x92" else "0x93")
           else
           if n <= 149n
           then (if n <= 148n then "0x94" else "0x95")
           else if n <= 150n then "0x96" else "0x97")
        else
        if n <= 155n
        then
          (if n <= 153n
           then (if n <= 152n then "0x98" else "0x99")
           else if n <= 154n then "0x9a" else "0x9b")
        else
        if n <= 157n
        then (if n <= 156n then "0x9c" else "0x9d")
        else if n <= 158n then "0x9e" else "0x9f")
     else
     if n <= 175n
     then
       (if n <= 167n
        then
          (if n <= 163n
           then
             (if n <= 161n
              then (if n <= 160n then "0xa0" else "0xa1")
              else if n <= 162n then "0xa2" else "0xa3")
           else
           if n <= 165n
           then (if n <= 164n then "0xa4" else "0xa5")
           else if n <= 166n then "0xa6" else "0xa7")
        else
        if n <= 171n
        then
          (if n <= 169n
           then (if n <= 168n then "0xa8" else "0xa9")
           else if n <= 170n then "0xaa" else "0xab")
        else
        if n <= 173n
        then (if n <= 172n then "0xac" else "0xad")
        else if n <= 174n then "0xae" else "0xaf")
     else
     if n <= 183n
     then
       (if n <= 179n
        then
          (if n <= 177n
           then (if n <= 176n then "0xb0" else "0xb1")
           else if n <= 178n then "0xb2" else "0xb3")
        else
        if n <= 181n
        then (if n <= 180n then "0xb4" else "0xb5")
        else if n <= 182n then "0xb6" else "0xb7")
     else
     if n <= 187n
     then
       (if n <= 185n
        then (if n <= 184n then "0xb8" else "0xb9")
        else if n <= 186n then "0xba" else "0xbb")
     else
     if n <= 189n
     then (if n <= 188n then "0xbc" else "0xbd")
     else if n <= 190n then "0xbe" else "0xbf")
  else
  if n <= 223n
  then
    (if n <= 207n
     then
       (if n <= 199n
        then
          (if n <= 195n
           then
             (if n <= 193n
              then (if n <= 192n then "0xc0" else "0xc1")
              else if n <= 194n then "0xc2" else "0xc3")
           else
           if n <= 197n
           then (if n <= 196n then "0xc4" else "0xc5")
           else if n <= 198n then "0xc6" else "0xc7")
        else
        if n <= 203n
        then
          (if n <= 201n
           then (if n <= 200n then "0xc8" else "0xc9")
           else if n <= 202n then "0xca" else "0xcb")
        else
        if n <= 205n
        then (if n <= 204n then "0xcc" else "0xcd")
        else if n <= 206n then "0xce" else "0xcf")
     else
     if n <= 215n
     then
       (if n <= 211n
        then
          (if n <= 209n
           then (if n <= 208n then "0xd0" else "0xd1")
           else if n <= 210n then "0xd2" else "0xd3")
        else
        if n <= 213n
        then (if n <= 212n then "0xd4" else "0xd5")
        else if n <= 214n then "0xd6" else "0xd7")
     else
     if n <= 219n
     then
       (if n <= 217n
        then (if n <= 216n then "0xd8" else "0xd9")
        else if n <= 218n then "0xda" else "0xdb")
     else
     if n <= 221n
     then (if n <= 220n then "0xdc" else "0xdd")
     else if n <= 222n then "0xde" else "0xdf")
  else
  if n <= 239n
  then
    (if n <= 231n
     then
       (if n <= 227n
        then
          (if n <= 225n
           then (if n <= 224n then "0xe0" else "0xe1")
           else if n <= 226n then "0xe2" else "0xe3")
        else
        if n <= 229n
        then (if n <= 228n then "0xe4" else "0xe5")
        else if n <= 230n then "0xe6" else "0xe7")
     else
     if n <= 235n
     then
       (if n <= 233n
        then (if n <= 232n then "0xe8" else "0xe9")
        else if n <= 234n then "0xea" else "0xeb")
     else
     if n <= 237n
     then (if n <= 236n then "0xec" else "0xed")
     else if n <= 238n then "0xee" else "0xef")
  else
  if n <= 247n
  then
    (if n <= 243n
     then
       (if n <= 241n
        then (if n <= 240n then "0xf0" else "0xf1")
        else if n <= 242n then "0xf2" else "0xf3")
     else
     if n <= 245n
     then (if n <= 244n then "0xf4" else "0xf5")
     else if n <= 246n then "0xf6" else "0xf7")
  else
  if n <= 251n
  then
    (if n <= 249n
     then (if n <= 248n then "0xf8" else "0xf9")
     else if n <= 250n then "0xfa" else "0xfb")
  else
  if n <= 253n
  then (if n <= 252n then "0xfc" else "0xfd")
  else if n <= 254n then "0xfe" else "0xff"

#endif